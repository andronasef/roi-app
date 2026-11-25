import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGoogleSignin, mockPlatform, mockStatusCodes } = vi.hoisted(() => ({
  mockGoogleSignin: {
    configure: vi.fn(),
    hasPlayServices: vi.fn(),
    signIn: vi.fn(),
    addScopes: vi.fn(),
    signInSilently: vi.fn(),
    signOut: vi.fn(),
    getCurrentUser: vi.fn(),
    getTokens: vi.fn(),
  },
  mockPlatform: {
    OS: 'ios' as 'ios' | 'android',
  },
  mockStatusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
    NULL_PRESENTER: 'NULL_PRESENTER',
  } as const,
}));

vi.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: mockGoogleSignin,
  statusCodes: mockStatusCodes,
  isSuccessResponse: (res: { type?: string } | null) =>
    res?.type === 'success',
  isCancelledResponse: (res: { type?: string } | null) =>
    res?.type === 'cancelled',
  isNoSavedCredentialFoundResponse: (res: { type?: string } | null) =>
    res?.type === 'noSavedCredentialFound',
  isErrorWithCode: (err: unknown): err is { code: string } =>
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code?: unknown }).code === 'string',
}));

vi.mock('react-native', () => ({
  Platform: mockPlatform,
}));

import { GOOGLE_OAUTH } from '../../../constants/app';
import {
  DRIVE_APPDATA_SCOPE,
  configureGoogleSignIn,
  getGoogleAccountStatus,
  getGoogleSessionToken,
  requestGoogleDriveScopeUpgrade,
  signInWithGoogleDriveScope,
} from '../auth';

function makeUser(overrides?: {
  email?: string;
  idToken?: string | null;
  scopes?: string[];
}) {
  return {
    user: {
      id: 'google-user-1',
      name: 'يوسف',
      email: overrides?.email ?? 'youssef@example.com',
      photo: null,
      familyName: null,
      givenName: 'يوسف',
    },
    scopes: overrides?.scopes ?? [DRIVE_APPDATA_SCOPE],
    idToken: overrides?.idToken === undefined ? 'id-token-123' : overrides.idToken,
    serverAuthCode: null,
  };
}

describe('Google Sign-In helper (drive.appdata + idToken)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlatform.OS = 'ios';
    mockGoogleSignin.hasPlayServices.mockResolvedValue(true);
    mockGoogleSignin.getTokens.mockResolvedValue({
      idToken: 'fresh-id-token',
      accessToken: 'fresh-access-token',
    });
  });

  it('configures iosClientId, webClientId, and drive.appdata scope without backend token-exchange flags', () => {
    configureGoogleSignIn();

    expect(mockGoogleSignin.configure).toHaveBeenCalledTimes(1);
    const configArg = mockGoogleSignin.configure.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(configArg).toEqual({
      iosClientId: GOOGLE_OAUTH.iosClientId,
      webClientId: GOOGLE_OAUTH.webClientId,
      scopes: [DRIVE_APPDATA_SCOPE],
    });
    expect(Object.keys(configArg)).not.toContain('offlineAccess');
    expect(Object.keys(configArg)).not.toContain('serverAuthCode');
  });

  it('signs in with drive.appdata scope, upgrades scope if missing, and handles cancellation or failure safely', async () => {
    mockPlatform.OS = 'android';
    mockGoogleSignin.signIn.mockResolvedValueOnce({
      type: 'success',
      data: makeUser({ idToken: null, scopes: ['email', 'profile'] }),
    });
    mockGoogleSignin.addScopes.mockResolvedValueOnce({
      type: 'success',
      data: makeUser({ idToken: null, scopes: ['email', DRIVE_APPDATA_SCOPE] }),
    });

    const successResult = await signInWithGoogleDriveScope();
    expect(mockGoogleSignin.hasPlayServices).toHaveBeenCalledWith({
      showPlayServicesUpdateDialog: true,
    });
    expect(mockGoogleSignin.addScopes).toHaveBeenCalledWith({
      scopes: [DRIVE_APPDATA_SCOPE],
    });
    expect(mockGoogleSignin.signOut).not.toHaveBeenCalled();
    expect(successResult).toEqual({
      status: 'success',
      idToken: 'fresh-id-token',
      email: 'youssef@example.com',
      hasDriveScope: true,
    });

    // User cancellation never throws or traps
    mockGoogleSignin.signIn.mockResolvedValueOnce({
      type: 'cancelled',
      data: null,
    });
    expect(await signInWithGoogleDriveScope()).toEqual({
      status: 'cancelled',
    });

    // Native cancellation error code maps cleanly
    mockGoogleSignin.signIn.mockRejectedValueOnce({
      code: mockStatusCodes.SIGN_IN_CANCELLED,
    });
    expect(await signInWithGoogleDriveScope()).toEqual({
      status: 'cancelled',
    });

    // Play services or network error maps cleanly without throwing uncaught
    mockGoogleSignin.hasPlayServices.mockRejectedValueOnce({
      code: mockStatusCodes.PLAY_SERVICES_NOT_AVAILABLE,
    });
    expect(await signInWithGoogleDriveScope()).toEqual({
      status: 'error',
      reason: 'play_services',
    });

    mockGoogleSignin.hasPlayServices.mockResolvedValue(true);
    mockGoogleSignin.signIn.mockRejectedValueOnce(new Error('network down'));
    expect(await signInWithGoogleDriveScope()).toEqual({
      status: 'error',
      reason: 'failed',
    });
  });

  it('restores silent session tokens, reports unauthenticated when absent, and upgrades drive scope in Settings', async () => {
    // 1. No current user and no saved credential -> unauthenticated
    mockGoogleSignin.getCurrentUser.mockReturnValueOnce(null);
    mockGoogleSignin.signInSilently.mockResolvedValueOnce({
      type: 'noSavedCredentialFound',
      data: null,
    });
    expect(await getGoogleSessionToken()).toEqual({ status: 'unauthenticated' });

    // 2. Silent restore succeeds and fetches fresh idToken via getTokens()
    mockGoogleSignin.getCurrentUser.mockReturnValueOnce(null);
    mockGoogleSignin.signInSilently.mockResolvedValueOnce({
      type: 'success',
      data: makeUser({ email: 'maryam@example.com', idToken: 'stale-token' }),
    });
    expect(await getGoogleSessionToken()).toEqual({
      status: 'authenticated',
      idToken: 'fresh-id-token',
      email: 'maryam@example.com',
      hasDriveScope: true,
    });

    // 3. Settings scope upgrade calls addScopes when signed in without drive.appdata
    mockGoogleSignin.getCurrentUser.mockReturnValueOnce(
      makeUser({ scopes: ['email'], idToken: 'token-1' }),
    );
    mockGoogleSignin.addScopes.mockResolvedValueOnce({
      type: 'success',
      data: makeUser({
        scopes: ['email', DRIVE_APPDATA_SCOPE],
        idToken: 'token-2',
      }),
    });
    expect(await requestGoogleDriveScopeUpgrade()).toEqual({
      status: 'success',
      idToken: 'token-2',
      email: 'youssef@example.com',
      hasDriveScope: true,
    });
    expect(mockGoogleSignin.addScopes).toHaveBeenCalledWith({
      scopes: [DRIVE_APPDATA_SCOPE],
    });

    // 4. Account status inspects current user without logging PII
    mockGoogleSignin.getCurrentUser.mockReturnValueOnce(
      makeUser({ email: 'user@example.com', scopes: [DRIVE_APPDATA_SCOPE] }),
    );
    expect(await getGoogleAccountStatus()).toEqual({
      signedIn: true,
      email: 'user@example.com',
      hasDriveScope: true,
    });
  });
});
