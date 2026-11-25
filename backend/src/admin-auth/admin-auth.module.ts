import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_OAUTH_CLIENT } from '../common/google-auth.guard';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminAuthResolver } from './admin-auth.resolver';
import { AdminAuthService } from './admin-auth.service';

@Module({
  imports: [JwtModule.register({})],
  providers: [
    {
      provide: GOOGLE_OAUTH_CLIENT,
      useFactory: () => new OAuth2Client(),
    },
    AdminAuthService,
    AdminAuthGuard,
    AdminAuthResolver,
  ],
  exports: [GOOGLE_OAUTH_CLIENT, AdminAuthService, AdminAuthGuard, AdminAuthResolver],
})
export class AdminAuthModule {}
