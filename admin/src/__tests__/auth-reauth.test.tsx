import { useEffect, useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import { AdminShell } from '@/components/layout/AdminShell';
import { executeAdminGraphQL } from '@/lib/graphql';
import { ADMIN_DICTIONARY, ADMIN_LANG_STORAGE_KEY, I18nProvider, type AdminLang } from '@/lib/i18n';
import { LoginPage } from '@/pages/LoginPage';

// jsdom never loads the GIS script, so stand in for the Google button: one click = one credential.
vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  GoogleLogin: ({ onSuccess }: { onSuccess: (r: { credential: string }) => void }) => (
    <button type="button" onClick={() => onSuccess({ credential: 'google-id-token' })}>
      google-button
    </button>
  ),
}));

const ME = { sub: 's1', email: 'admin@example.com' };
const unauthenticated = {
  errors: [{ message: 'ADMIN_SESSION_INVALID', extensions: { code: 'UNAUTHENTICATED' } }],
};
const allowlistRefusal = {
  errors: [
    {
      message: 'ADMIN_EMAIL_NOT_ALLOWLISTED',
      extensions: { code: 'FORBIDDEN', originalError: { statusCode: 403 } },
    },
  ],
};

type Handler = (variables: Record<string, unknown> | undefined) => unknown;
let handlers: Record<string, Handler>;
let requests: { query: string; init: RequestInit }[];

beforeEach(() => {
  requests = [];
  handlers = {
    adminPublicConfig: () => ({ data: { adminPublicConfig: { googleClientId: 'client-id' } } }),
    adminContentVersion: () => ({ data: { adminContentVersion: 12 } }),
    adminSuggestions: () => ({ data: { adminSuggestions: [] } }),
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: RequestInit) => {
      const { query, variables } = JSON.parse(String(init.body)) as {
        query: string;
        variables?: Record<string, unknown>;
      };
      requests.push({ query, init });
      const name = Object.keys(handlers).find((key) => query.includes(key));
      const body = name ? handlers[name]!(variables) : { errors: [{ message: 'unhandled' }] };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete (window as unknown as { google?: unknown }).google;
});

function renderWithProviders(ui: React.ReactNode, lang: AdminLang = 'en') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLang={lang}>
        <AuthProvider>
          <MemoryRouter initialEntries={['/verses']}>{ui}</MemoryRouter>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <LoginPage />;
}

describe('credentialed client', () => {
  it('sends the session cookie and the x-roi-admin CSRF header on every request', async () => {
    await executeAdminGraphQL('query { adminContentVersion }');
    const { init } = requests[0]!;
    expect(init.credentials).toBe('include');
    expect(new Headers(init.headers).get('x-roi-admin')).toBe('1');
  });
});

describe('login gate', () => {
  it('renders LoginPage when unauthenticated and shows the allowlist refusal copy on 403', async () => {
    handlers.adminMe = () => unauthenticated;
    handlers.adminLogin = () => allowlistRefusal;
    renderWithProviders(<Gate>shell</Gate>);

    fireEvent.click(await screen.findByText('google-button'));
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      ADMIN_DICTIONARY.en.errors.allowlist403,
    );
    expect(screen.queryByText('shell')).toBeNull();
  });
});

describe('AdminShell bilingual layout', () => {
  it('toggles dir and digit style between Arabic and English', async () => {
    handlers.adminMe = () => ({ data: { adminMe: ME } });
    renderWithProviders(
      <Gate>
        <Routes>
          <Route element={<AdminShell />}>
            <Route path="verses" element={<p>page</p>} />
          </Route>
        </Routes>
      </Gate>,
      'ar',
    );

    const shell = await screen.findByTestId('admin-shell');
    expect(shell.getAttribute('dir')).toBe('rtl');
    expect(screen.getByText(ME.email)).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('content-version').textContent).toContain('١٢'));
    expect(screen.getByTestId('pending-count').textContent).toBe('٠');

    fireEvent.click(screen.getByRole('button', { name: ADMIN_DICTIONARY.ar.nav.switchLanguage }));
    await waitFor(() => expect(shell.getAttribute('dir')).toBe('ltr'));
    expect(shell.getAttribute('lang')).toBe('en');
    expect(screen.getByTestId('content-version').textContent).toContain('12');
    expect(screen.getByTestId('pending-count').textContent).toBe('0');
    expect(window.localStorage.getItem(ADMIN_LANG_STORAGE_KEY)).toBe('en');
  });
});

describe('mid-edit 401 re-authentication', () => {
  let mounts: number;

  function DraftForm() {
    const [text, setText] = useState('');
    const [saved, setSaved] = useState(false);
    useEffect(() => {
      mounts += 1;
    }, []);
    return (
      <>
        <input aria-label="draft" value={text} onChange={(e) => setText(e.target.value)} />
        <button
          type="button"
          onClick={async () => {
            await executeAdminGraphQL('mutation { saveDraft }');
            setSaved(true);
          }}
        >
          save
        </button>
        {saved ? <p>saved-ok</p> : null}
      </>
    );
  }

  function setupExpiringSession() {
    let fresh = false;
    mounts = 0;
    handlers.adminMe = () => ({ data: { adminMe: ME } });
    handlers.adminLogin = () => {
      fresh = true;
      return { data: { adminLogin: ME } };
    };
    handlers.saveDraft = () => (fresh ? { data: { saveDraft: true } } : unauthenticated);
  }

  async function typeAndSave() {
    const input = (await screen.findByLabelText('draft')) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'unsaved verse text' } });
    fireEvent.click(screen.getByText('save'));
    return input;
  }

  it('opens the modal without unmounting the form, then retries the save after sign-in', async () => {
    setupExpiringSession();
    renderWithProviders(
      <Gate>
        <DraftForm />
      </Gate>,
    );
    const input = await typeAndSave();

    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain(ADMIN_DICTIONARY.en.errors.sessionExpired401);
    expect(input.value).toBe('unsaved verse text');

    fireEvent.click(screen.getByText('google-button'));
    expect(await screen.findByText('saved-ok')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(input.value).toBe('unsaved verse text');
    expect(mounts).toBe(1);
  });

  it('renews silently via GIS when available, without opening the modal', async () => {
    setupExpiringSession();
    let callback: (r: { credential: string }) => void = () => undefined;
    (window as unknown as { google: unknown }).google = {
      accounts: {
        id: {
          initialize: (cfg: { callback: typeof callback }) => {
            callback = cfg.callback;
          },
          prompt: () => callback({ credential: 'silent-token' }),
        },
      },
    };
    renderWithProviders(
      <Gate>
        <DraftForm />
      </Gate>,
    );
    const input = await typeAndSave();

    expect(await screen.findByText('saved-ok')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(input.value).toBe('unsaved verse text');
    const login = requests.find((r) => r.query.includes('adminLogin'))!;
    expect(JSON.parse(String(login.init.body)).variables.idToken).toBe('silent-token');
  });
});
