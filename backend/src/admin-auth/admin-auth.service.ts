import {
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import {
  GOOGLE_OAUTH_CLIENT,
  type GoogleTokenVerifier,
} from '../common/google-auth.guard';
import type { BackendEnv } from '../config/env';
import { BACKEND_ENV } from '../db/drizzle.module';

export const ADMIN_COOKIE_NAME = 'roi_admin_session';
export const ADMIN_COOKIE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const ADMIN_JWT_EXPIRES_IN_SECONDS = 14 * 24 * 60 * 60;
const DEV_FALLBACK_JWT_SECRET = 'roi-dev-only-admin-jwt-secret-not-for-production';
const MIN_PROD_JWT_SECRET_LENGTH = 32;

export interface AdminCookieOptions {
  readonly httpOnly: boolean;
  readonly sameSite: 'lax' | 'strict' | 'none';
  readonly secure: boolean;
  readonly path: string;
  readonly maxAge?: number;
}

export interface AdminUser {
  readonly sub: string;
  readonly email: string;
}

export interface AdminRequest {
  headers?: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string | undefined>;
  adminUser?: AdminUser;
}

interface AdminSessionPayload {
  sub?: unknown;
  email?: unknown;
  typ?: unknown;
}

/**
 * Verifies Google ID tokens against the env-configured `ADMIN_EMAILS` allowlist
 * and mints/verifies 14-day HS256 `httpOnly` cookie session JWTs (D-01, D-02).
 */
@Injectable()
export class AdminAuthService {
  private readonly oauthClient: GoogleTokenVerifier;
  private readonly allowlist: Set<string>;

  constructor(
    @Inject(BACKEND_ENV) private readonly env: BackendEnv,
    private readonly jwtService: JwtService,
    @Optional()
    @Inject(GOOGLE_OAUTH_CLIENT)
    oauthClient?: GoogleTokenVerifier,
  ) {
    this.oauthClient = oauthClient ?? new OAuth2Client();
    this.allowlist = new Set(
      env.ADMIN_EMAILS.map((email) => email.trim().toLowerCase()).filter(
        (email) => email.length > 0,
      ),
    );
  }

  getPublicGoogleClientId(): string {
    return this.env.ADMIN_GOOGLE_CLIENT_ID ?? this.env.GOOGLE_CLIENT_IDS[0] ?? '';
  }

  /** ID-token audience: the dedicated admin web client when set, else the configured client IDs. */
  private adminAudience(): string[] {
    return this.env.ADMIN_GOOGLE_CLIENT_ID
      ? [this.env.ADMIN_GOOGLE_CLIENT_ID]
      : [...this.env.GOOGLE_CLIENT_IDS];
  }

  getCookieOptions(isProd = this.env.NODE_ENV === 'production'): AdminCookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: ADMIN_COOKIE_MAX_AGE_MS,
    };
  }

  getClearCookieOptions(isProd = this.env.NODE_ENV === 'production'): AdminCookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/',
    };
  }

  async authenticateGoogleIdToken(
    idToken: string,
  ): Promise<{ admin: AdminUser; sessionToken: string }> {
    const secret = this.getSigningSecret();

    let payload: { sub?: string; email?: string; email_verified?: boolean } | undefined;
    try {
      const ticket = await this.oauthClient.verifyIdToken({
        idToken,
        audience: this.adminAudience(),
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('GOOGLE_TOKEN_INVALID');
    }

    if (
      !payload ||
      payload.email_verified !== true ||
      typeof payload.sub !== 'string' ||
      payload.sub.length === 0 ||
      typeof payload.email !== 'string' ||
      payload.email.trim().length === 0
    ) {
      throw new UnauthorizedException('GOOGLE_TOKEN_INVALID');
    }

    const email = payload.email.trim().toLowerCase();
    if (!this.allowlist.has(email)) {
      throw new ForbiddenException('ADMIN_EMAIL_NOT_ALLOWLISTED');
    }

    const admin: AdminUser = {
      sub: payload.sub,
      email,
    };

    const sessionToken = this.jwtService.sign(
      {
        sub: admin.sub,
        email: admin.email,
        typ: 'roi_admin',
      },
      {
        secret,
        algorithm: 'HS256',
        expiresIn: ADMIN_JWT_EXPIRES_IN_SECONDS,
      },
    );

    return { admin, sessionToken };
  }

  verifySessionToken(token: string): AdminUser {
    const secret = this.getSigningSecret();

    let decoded: AdminSessionPayload;
    try {
      decoded = this.jwtService.verify<AdminSessionPayload>(token, {
        secret,
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException('ADMIN_SESSION_INVALID');
    }

    if (
      decoded.typ !== 'roi_admin' ||
      typeof decoded.sub !== 'string' ||
      decoded.sub.length === 0 ||
      typeof decoded.email !== 'string'
    ) {
      throw new UnauthorizedException('ADMIN_SESSION_INVALID');
    }

    const email = decoded.email.trim().toLowerCase();
    if (email.length === 0 || !this.allowlist.has(email)) {
      throw new UnauthorizedException('ADMIN_SESSION_INVALID');
    }

    return {
      sub: decoded.sub,
      email,
    };
  }

  private getSigningSecret(): string {
    const configured = this.env.ADMIN_JWT_SECRET;
    if (this.env.NODE_ENV === 'production') {
      if (!configured || configured.length < MIN_PROD_JWT_SECRET_LENGTH) {
        throw new ServiceUnavailableException('ADMIN_AUTH_MISCONFIGURED');
      }
      return configured;
    }
    return configured && configured.length > 0 ? configured : DEV_FALLBACK_JWT_SECRET;
  }
}
