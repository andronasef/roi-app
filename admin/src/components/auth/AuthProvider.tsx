import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ReauthModal, type AuthErrorKind } from '@/components/auth/ReauthModal';
import {
  AdminApiError,
  adminLoginMutation,
  adminLogoutMutation,
  adminMeQuery,
  fetchAdminPublicConfig,
  registerUnauthorizedHandler,
  type AdminUser,
} from '@/lib/graphql';

export type AuthState = AuthErrorKind | 'notConfigured';

export interface AuthContextValue {
  user: AdminUser | null;
  isLoading: boolean;
  googleClientId: string | null;
  authError: AuthState | null;
  loginWithCredential: (credential: string) => Promise<boolean>;
  logout: () => Promise<void>;
  handleUnauthorized: () => Promise<boolean>;
  retryBoot: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

const SILENT_TIMEOUT_MS = 2500;

interface GisId {
  initialize: (config: {
    client_id: string;
    auto_select?: boolean;
    callback: (response: { credential?: string }) => void;
  }) => void;
  prompt: (
    listener?: (n: { isNotDisplayed?: () => boolean; isSkippedMoment?: () => boolean }) => void,
  ) => void;
}

/** Silent GIS renewal (D-03). Resolves null when One Tap/FedCM is unavailable or suppressed. */
function trySilentGis(clientId: string): Promise<string | null> {
  const gis = (window as unknown as { google?: { accounts?: { id?: GisId } } }).google?.accounts?.id;
  if (!gis) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), SILENT_TIMEOUT_MS);
    const done = (credential: string | null) => {
      clearTimeout(timer);
      resolve(credential);
    };
    try {
      gis.initialize({
        client_id: clientId,
        auto_select: true,
        callback: (r) => done(r.credential ?? null),
      });
      gis.prompt((n) => {
        if (n.isNotDisplayed?.() || n.isSkippedMoment?.()) {
          done(null);
        }
      });
    } catch {
      done(null);
    }
  });
}

function classify(error: unknown): AuthErrorKind {
  if (error instanceof AdminApiError) {
    if (error.isAllowlistRefusal) return 'allowlist';
    if (error.code !== 'NETWORK') return 'invalid';
  }
  return 'network';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<AuthState | null>(null);
  const [bootAttempt, setBootAttempt] = useState(0);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pending = useRef<Promise<boolean> | null>(null);
  const modalResolve = useRef<((ok: boolean) => void) | null>(null);
  const clientIdRef = useRef<string | null>(null);
  clientIdRef.current = googleClientId;

  // Boot: public config + existing 14-day cookie session. No re-auth prompts here.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setAuthError(null);
    (async () => {
      try {
        const config = await fetchAdminPublicConfig();
        if (cancelled) return;
        if (!config.googleClientId) {
          setAuthError('notConfigured');
          return;
        }
        setGoogleClientId(config.googleClientId);
        try {
          const me = await adminMeQuery();
          if (!cancelled) setUser(me);
        } catch (error) {
          // 401/403 simply means "no session yet"; only transport failures are an error.
          if (!cancelled && error instanceof AdminApiError && error.code === 'NETWORK') {
            setAuthError('network');
          }
        }
      } catch {
        if (!cancelled) setAuthError('network');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bootAttempt]);

  const loginWithCredential = useCallback(async (credential: string) => {
    setAuthError(null);
    setSubmitting(true);
    try {
      setUser(await adminLoginMutation(credential));
      return true;
    } catch (error) {
      setAuthError(classify(error));
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminLogoutMutation();
    } finally {
      setUser(null);
    }
  }, []);

  const handleUnauthorized = useCallback((): Promise<boolean> => {
    if (pending.current) {
      return pending.current; // dedupe concurrent 401s onto one refresh
    }
    const flow = (async () => {
      const clientId = clientIdRef.current;
      const silent = clientId ? await trySilentGis(clientId) : null;
      if (silent && (await loginWithCredential(silent))) {
        return true;
      }
      setAuthError(null);
      return new Promise<boolean>((resolve) => {
        modalResolve.current = resolve;
        setReauthOpen(true);
      });
    })().finally(() => {
      pending.current = null;
    });
    pending.current = flow;
    return flow;
  }, [loginWithCredential]);

  const onModalCredential = useCallback(
    async (credential: string) => {
      if (await loginWithCredential(credential)) {
        setReauthOpen(false);
        modalResolve.current?.(true);
        modalResolve.current = null;
      }
    },
    [loginWithCredential],
  );

  useEffect(() => {
    if (!user) return;
    registerUnauthorizedHandler(handleUnauthorized);
    return () => registerUnauthorizedHandler(null);
  }, [user, handleUnauthorized]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      googleClientId,
      authError,
      loginWithCredential,
      logout,
      handleUnauthorized,
      retryBoot: () => setBootAttempt((n) => n + 1),
    }),
    [user, isLoading, googleClientId, authError, loginWithCredential, logout, handleUnauthorized],
  );

  const tree = (
    <AuthContext.Provider value={value}>
      {children}
      {/* Sibling of children: opening it never unmounts or resets page/editor state (D-03). */}
      <ReauthModal
        open={reauthOpen}
        submitting={submitting}
        error={authError === 'notConfigured' ? 'invalid' : authError}
        onCredential={onModalCredential}
      />
    </AuthContext.Provider>
  );

  // The client id is known before any session exists, so this switch only happens during boot.
  return googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId}>{tree}</GoogleOAuthProvider>
  ) : (
    tree
  );
}
