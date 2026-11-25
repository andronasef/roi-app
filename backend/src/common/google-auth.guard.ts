import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { OAuth2Client } from 'google-auth-library';
import type { BackendEnv } from '../config/env';
import { BACKEND_ENV } from '../db/drizzle.module';

export const GOOGLE_OAUTH_CLIENT = Symbol('GOOGLE_OAUTH_CLIENT');

export interface GoogleUser {
  readonly googleSub: string;
  readonly email: string;
}

export interface GoogleTokenVerifier {
  verifyIdToken(options: {
    idToken: string;
    audience: string | string[];
  }): Promise<{
    getPayload():
      | {
          sub?: string;
          email?: string;
          email_verified?: boolean;
        }
      | undefined;
  }>;
}

export interface GoogleAuthenticatedRequest {
  headers?: Record<string, string | string[] | undefined>;
  googleUser?: GoogleUser;
}

/**
 * Verify a Google ID token Bearer header against configured `roi-app-515721`
 * OAuth client IDs and attach `{ googleSub, email }` to `req.googleUser` (D-10).
 */
@Injectable()
export class GoogleAuthGuard implements CanActivate {
  private readonly oauthClient: GoogleTokenVerifier;

  constructor(
    @Inject(BACKEND_ENV) private readonly env: BackendEnv,
    @Optional()
    @Inject(GOOGLE_OAUTH_CLIENT)
    oauthClient?: GoogleTokenVerifier,
  ) {
    this.oauthClient = oauthClient ?? new OAuth2Client();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = this.extractRequest(context);
    const authHeader = req.headers?.authorization;
    const rawHeader = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const match = typeof rawHeader === 'string' ? rawHeader.match(/^Bearer\s+(.+)$/i) : null;
    const idToken = match?.[1]?.trim();

    if (!idToken) {
      throw new UnauthorizedException('GOOGLE_TOKEN_REQUIRED');
    }

    let payload: { sub?: string; email?: string; email_verified?: boolean } | undefined;
    try {
      const ticket = await this.oauthClient.verifyIdToken({
        idToken,
        audience: this.env.GOOGLE_CLIENT_IDS,
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
      payload.email.length === 0
    ) {
      throw new UnauthorizedException('GOOGLE_TOKEN_INVALID');
    }

    req.googleUser = {
      googleSub: payload.sub,
      email: payload.email,
    };

    return true;
  }

  private extractRequest(context: ExecutionContext): GoogleAuthenticatedRequest {
    if (context.getType<string>() === 'graphql') {
      return GqlExecutionContext.create(context).getContext<{
        req: GoogleAuthenticatedRequest;
      }>().req;
    }
    return context.switchToHttp().getRequest<GoogleAuthenticatedRequest>();
  }
}
