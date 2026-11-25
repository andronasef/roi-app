import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { ContentModule } from '../content/content.module';
import { AdminContentResolver } from './admin-content.resolver';
import { AdminContentService } from './admin-content.service';

@Module({
  imports: [ContentModule, AdminAuthModule],
  providers: [AdminContentService, AdminContentResolver],
  exports: [AdminContentService],
})
export class AdminContentModule {}
