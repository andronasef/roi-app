import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { ContentModule } from '../content/content.module';
import { AdminModerationResolver } from './admin-moderation.resolver';
import { AdminModerationService } from './admin-moderation.service';

@Module({
  imports: [ContentModule, AdminAuthModule],
  providers: [AdminModerationService, AdminModerationResolver],
  exports: [AdminModerationService],
})
export class AdminModerationModule {}
