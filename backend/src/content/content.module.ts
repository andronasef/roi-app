import { Module } from '@nestjs/common';
import { ContentResolver } from './content.resolver';
import { ContentService } from './content.service';
import { SnapshotController } from './snapshot.controller';
import { SnapshotService } from './snapshot.service';

@Module({
  controllers: [SnapshotController],
  providers: [SnapshotService, ContentService, ContentResolver],
  exports: [SnapshotService, ContentService],
})
export class ContentModule {}
