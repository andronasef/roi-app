import { ClientError, GraphQLClient } from 'graphql-request';

/**
 * Credentialed admin GraphQL client (D-02, D-14): the httpOnly session cookie travels via
 * `credentials: 'include'`, and the non-simple `x-roi-admin: 1` header is the CSRF gate the
 * backend AdminAuthGuard requires. Same-origin in production, Vite-proxied in dev.
 */
const client = new GraphQLClient('/graphql', {
  credentials: 'include',
  headers: { 'x-roi-admin': '1' },
});

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }

  get isUnauthenticated(): boolean {
    return this.code === 'UNAUTHENTICATED' || this.status === 401;
  }

  get isAllowlistRefusal(): boolean {
    return this.message.includes('ADMIN_EMAIL_NOT_ALLOWLISTED');
  }
}

function toAdminApiError(error: unknown): AdminApiError {
  if (error instanceof AdminApiError) {
    return error;
  }
  if (error instanceof ClientError) {
    const first = error.response.errors?.[0];
    const original = first?.extensions?.originalError as
      | { statusCode?: number; message?: string | string[] }
      | undefined;
    const originalMessage = Array.isArray(original?.message)
      ? original.message.join(' ')
      : original?.message;
    return new AdminApiError(
      [first?.message, originalMessage].filter(Boolean).join(' ') || 'GraphQL error',
      String(first?.extensions?.code ?? 'GRAPHQL_ERROR'),
      original?.statusCode ?? error.response.status,
    );
  }
  return new AdminApiError(error instanceof Error ? error.message : 'Network error', 'NETWORK', 0);
}

type UnauthorizedHandler = () => Promise<boolean>;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/** AuthProvider registers its silent-GIS / modal re-auth flow here (D-03). Pass null to unregister. */
export function registerUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export interface ExecuteOptions {
  /** Auth bootstrap calls (adminMe/adminLogin/...) must never trigger re-auth. Default true. */
  reauth?: boolean;
}

export async function executeAdminGraphQL<T>(
  document: string,
  variables?: Record<string, unknown>,
  { reauth = true }: ExecuteOptions = {},
): Promise<T> {
  const run = () => client.request<T>(document, variables).catch((e: unknown) => {
    throw toAdminApiError(e);
  });
  try {
    return await run();
  } catch (error) {
    if (reauth && unauthorizedHandler && error instanceof AdminApiError && error.isUnauthenticated) {
      if (await unauthorizedHandler()) {
        return run(); // retry exactly once on fresh credentials
      }
    }
    throw error;
  }
}

export interface AdminUser {
  sub: string;
  email: string;
}

const NO_REAUTH: ExecuteOptions = { reauth: false };

export const fetchAdminPublicConfig = () =>
  executeAdminGraphQL<{ adminPublicConfig: { googleClientId: string } }>(
    'query AdminPublicConfig { adminPublicConfig { googleClientId } }',
    undefined,
    NO_REAUTH,
  ).then((r) => r.adminPublicConfig);

export const adminMeQuery = () =>
  executeAdminGraphQL<{ adminMe: AdminUser }>(
    'query AdminMe { adminMe { sub email } }',
    undefined,
    NO_REAUTH,
  ).then((r) => r.adminMe);

export const adminLoginMutation = (idToken: string) =>
  executeAdminGraphQL<{ adminLogin: AdminUser }>(
    'mutation AdminLogin($idToken: String!) { adminLogin(idToken: $idToken) { sub email } }',
    { idToken },
    NO_REAUTH,
  ).then((r) => r.adminLogin);

export const adminLogoutMutation = () =>
  executeAdminGraphQL<{ adminLogout: boolean }>(
    'mutation AdminLogout { adminLogout }',
    undefined,
    NO_REAUTH,
  );
