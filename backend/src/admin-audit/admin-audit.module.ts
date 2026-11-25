import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminAuditResolver } from './admin-audit.resolver';

@Module({
  imports: [AdminAuthModule],
  providers: [AdminAuditResolver],
  exports: [AdminAuditResolver],
})
export class AdminAuditModule {}
