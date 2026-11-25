import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import {
  ADMIN_COOKIE_NAME,
  AdminAuthService,
  type AdminRequest,
} from './admin-auth.service';

/**
 * Protects privileged admin GraphQL operations by requiring both the custom
 * `x-roi-admin: 1` CSRF header and a valid allowlisted `roi_admin_session` cookie (D-02).
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = this.extractRequest(context);

    const rawCsrfHeader = req.headers?.['x-roi-admin'];
    const csrfHeader = Array.isArray(rawCsrfHeader) ? rawCsrfHeader[0] : rawCsrfHeader;
    if (csrfHeader !== '1') {
      throw new ForbiddenException('CSRF_HEADER_REQUIRED');
    }

    const token = req.cookies?.[ADMIN_COOKIE_NAME];
    if (!token) {
      throw new UnauthorizedException('ADMIN_SESSION_REQUIRED');
    }

    req.adminUser = this.adminAuthService.verifySessionToken(token);
    return true;
  }

  private extractRequest(context: ExecutionContext): AdminRequest {
    if (context.getType<string>() === 'graphql') {
      return GqlExecutionContext.create(context).getContext<{ req: AdminRequest }>().req;
    }
    return context.switchToHttp().getRequest<AdminRequest>();
  }
}
