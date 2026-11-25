import { UnauthorizedException, UseGuards } from '@nestjs/common';
import { Args, Context, Field, Mutation, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminAuthGuard } from './admin-auth.guard';
import {
  ADMIN_COOKIE_NAME,
  AdminAuthService,
  type AdminCookieOptions,
  type AdminRequest,
} from './admin-auth.service';

interface CookieResponse {
  cookie: (name: string, val: string, options: AdminCookieOptions) => unknown;
  clearCookie: (name: string, options: AdminCookieOptions) => unknown;
}

const idTokenSchema = z.string().min(1).max(8192);

@ObjectType()
export class AdminPublicConfigDto {
  @Field(() => String)
  googleClientId!: string;
}

@ObjectType()
export class AdminUserDto {
  @Field(() => String)
  sub!: string;

  @Field(() => String)
  email!: string;
}

@Resolver()
export class AdminAuthResolver {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Query(() => AdminPublicConfigDto)
  adminPublicConfig(): AdminPublicConfigDto {
    return {
      googleClientId: this.adminAuthService.getPublicGoogleClientId(),
    };
  }

  @UseGuards(AdminAuthGuard)
  @Query(() => AdminUserDto)
  adminMe(@Context() ctx: { req: AdminRequest }): AdminUserDto {
    const adminUser = ctx.req.adminUser;
    if (!adminUser) {
      throw new UnauthorizedException('ADMIN_SESSION_REQUIRED');
    }
    return adminUser;
  }

  @Throttle({ default: { ttl: 60_000, limit: 15 } })
  @Mutation(() => AdminUserDto)
  async adminLogin(
    @Args('idToken', { type: () => String }, new ZodValidationPipe(idTokenSchema))
    idToken: string,
    @Context() ctx: { req: AdminRequest; res: CookieResponse },
  ): Promise<AdminUserDto> {
    const { admin, sessionToken } =
      await this.adminAuthService.authenticateGoogleIdToken(idToken);
    ctx.res.cookie(
      ADMIN_COOKIE_NAME,
      sessionToken,
      this.adminAuthService.getCookieOptions(),
    );
    return admin;
  }

  @Mutation(() => Boolean)
  adminLogout(@Context() ctx: { res: CookieResponse }): boolean {
    ctx.res.clearCookie(ADMIN_COOKIE_NAME, this.adminAuthService.getClearCookieOptions());
    return true;
  }
}
