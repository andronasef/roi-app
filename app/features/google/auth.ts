import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
  statusCodes,
  type User,
} from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

import { GOOGLE_OAUTH } from '../../constants/app';

export const DRIVE_APPDATA_SCOPE =
  'https://www.googleapis.com/auth/drive.appdata';

export type GoogleSignInErrorReason =
  | 'play_services'
  | 'missing_token'
  | 'failed';

export type GoogleSignInResult =
  | {
      status: 'success';
      idToken: string;
      email: string | null;
      hasDriveScope: boolean;
    }
  | { status: 'cancelled' }
  | { status: 'error'; reason: GoogleSignInErrorReason };

export type GoogleSessionTokenResult =
  | {
      status: 'authenticated';
      idToken: string;
      email: string | null;
      hasDriveScope: boolean;
    }
  | { status: 'unauthenticated' }
  | { status: 'error'; reason: 'missing_token' | 'failed' };

export interface GoogleAccountStatus {
  signedIn: boolean;
  email: string | null;
  hasDriveScope: boolean;
}

function userHasDriveScope(user: Pick<User, 'scopes'> | null): boolean {
  return Array.isArray(user?.scopes) && user.scopes.includes(DRIVE_APPDATA_SCOPE);
}

/**
 * Configure on-device Google Sign-In with only iosClientId, webClientId, and
 * the non-sensitive drive.appdata scope (tokens stay strictly on device).
 */
export function configureGoogleSignIn(): void {
  GoogleSignin.configure({
    iosClientId: GOOGLE_OAUTH.iosClientId,
    webClientId: GOOGLE_OAUTH.webClientId,
    scopes: [DRIVE_APPDATA_SCOPE],
  });
}

async function resolveIdToken(userData: User): Promise<string | null> {
  if (typeof userData.idToken === 'string' && userData.idToken.trim().length > 0) {
    return userData.idToken;
  }
  const tokens = await GoogleSignin.getTokens();
  return typeof tokens.idToken === 'string' && tokens.idToken.trim().length > 0
    ? tokens.idToken
    : null;
}

/**
 * Prompt interactive Google Sign-In requesting the drive.appdata scope upfront.
 * Never throws uncaught and never calls signOut() on normal sign-in.
 */
export async function signInWithGoogleDriveScope(): Promise<GoogleSignInResult> {
  configureGoogleSignIn();

  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response) || !isSuccessResponse(response)) {
      return { status: 'cancelled' };
    }

    let userData = response.data;
    if (!userHasDriveScope(userData)) {
      const upgraded = await GoogleSignin.addScopes({
        scopes: [DRIVE_APPDATA_SCOPE],
      });
      if (upgraded) {
        if (isCancelledResponse(upgraded)) {
          return { status: 'cancelled' };
        }
        if (isSuccessResponse(upgraded)) {
          userData = upgraded.data;
        }
      }
    }

    const idToken = await resolveIdToken(userData);
    if (!idToken) {
      return { status: 'error', reason: 'missing_token' };
    }

    return {
      status: 'success',
      idToken,
      email: userData.user?.email ?? null,
      hasDriveScope: userHasDriveScope(userData),
    };
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return { status: 'cancelled' };
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { status: 'error', reason: 'play_services' };
      }
    }
    return { status: 'error', reason: 'failed' };
  }
}

/**
 * Upgrade an existing Google session to include drive.appdata when missing
 * (e.g. from Settings), or run full sign-in when not yet authenticated.
 */
export async function requestGoogleDriveScopeUpgrade(): Promise<GoogleSignInResult> {
  configureGoogleSignIn();

  try {
    let currentUser = GoogleSignin.getCurrentUser();
    if (!currentUser) {
      const silent = await GoogleSignin.signInSilently();
      if (!isNoSavedCredentialFoundResponse(silent) && silent.type === 'success') {
        currentUser = silent.data;
      }
    }

    if (!currentUser) {
      return signInWithGoogleDriveScope();
    }

    if (!userHasDriveScope(currentUser)) {
      const upgraded = await GoogleSignin.addScopes({
        scopes: [DRIVE_APPDATA_SCOPE],
      });
      if (upgraded) {
        if (isCancelledResponse(upgraded)) {
          return { status: 'cancelled' };
        }
        if (isSuccessResponse(upgraded)) {
          currentUser = upgraded.data;
        }
      }
    }

    const idToken = await resolveIdToken(currentUser);
    if (!idToken) {
      return { status: 'error', reason: 'missing_token' };
    }

    return {
      status: 'success',
      idToken,
      email: currentUser.user?.email ?? null,
      hasDriveScope: userHasDriveScope(currentUser),
    };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { status: 'cancelled' };
    }
    return { status: 'error', reason: 'failed' };
  }
}

/**
 * Retrieve a fresh Google ID token from the active or silently restored session
 * without prompting UI. Returns `{ status: 'unauthenticated' }` when none exists.
 */
export async function getGoogleSessionToken(): Promise<GoogleSessionTokenResult> {
  configureGoogleSignIn();

  try {
    let currentUser = GoogleSignin.getCurrentUser();
    if (!currentUser) {
      const silent = await GoogleSignin.signInSilently();
      if (isNoSavedCredentialFoundResponse(silent) || silent.type !== 'success') {
        return { status: 'unauthenticated' };
      }
      currentUser = silent.data;
    }

    const tokens = await GoogleSignin.getTokens();
    const idToken =
      typeof tokens.idToken === 'string' && tokens.idToken.trim().length > 0
        ? tokens.idToken
        : currentUser.idToken;

    if (!idToken || idToken.trim().length === 0) {
      return { status: 'error', reason: 'missing_token' };
    }

    return {
      status: 'authenticated',
      idToken,
      email: currentUser.user?.email ?? null,
      hasDriveScope: userHasDriveScope(currentUser),
    };
  } catch (error) {
    if (
      isErrorWithCode(error) &&
      error.code === statusCodes.SIGN_IN_REQUIRED
    ) {
      return { status: 'unauthenticated' };
    }
    return { status: 'error', reason: 'failed' };
  }
}

/**
 * Read current on-device Google account status without logging or exposing tokens.
 */
export async function getGoogleAccountStatus(): Promise<GoogleAccountStatus> {
  configureGoogleSignIn();

  try {
    let currentUser = GoogleSignin.getCurrentUser();
    if (!currentUser) {
      const silent = await GoogleSignin.signInSilently();
      if (!isNoSavedCredentialFoundResponse(silent) && silent.type === 'success') {
        currentUser = silent.data;
      }
    }

    if (!currentUser) {
      return {
        signedIn: false,
        email: null,
        hasDriveScope: false,
      };
    }

    return {
      signedIn: true,
      email: currentUser.user?.email ?? null,
      hasDriveScope: userHasDriveScope(currentUser),
    };
  } catch {
    return {
      signedIn: false,
      email: null,
      hasDriveScope: false,
    };
  }
}
