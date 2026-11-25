import { gunzipSync } from 'node:zlib';
import { BadRequestException, Controller, Get, Param, Req, Res } from '@nestjs/common';
import { snapshotTypeSchema } from '@roi/shared';
import { SnapshotService } from './snapshot.service';

interface SnapshotRequest {
  acceptsEncodings: (encoding: string) => string | false;
}

interface SnapshotResponse {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => SnapshotResponse;
  send: (body: Buffer | string) => unknown;
}

@Controller('snapshots')
export class SnapshotController {
  constructor(private readonly snapshotService: SnapshotService) {}

  @Get(':type')
  getSnapshot(
    @Param('type') rawType: string,
    @Req() req: SnapshotRequest,
    @Res() res: SnapshotResponse,
  ): void {
    const parsedType = snapshotTypeSchema.safeParse(rawType);
    if (!parsedType.success) {
      throw new BadRequestException(
        `Invalid snapshot type '${rawType}'. Expected one of: ${snapshotTypeSchema.options.join(', ')}`,
      );
    }

    const artifact = this.snapshotService.getSnapshot(parsedType.data);

    res.setHeader('ETag', artifact.etag);
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.setHeader('Vary', 'Accept-Encoding');
    res.setHeader('X-Content-Version', String(artifact.contentVersion));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.acceptsEncodings('gzip')) {
      res.setHeader('Content-Encoding', 'gzip');
      res.status(200).send(artifact.buffer);
      return;
    }

    const jsonBuffer = gunzipSync(artifact.buffer);
    res.status(200).send(jsonBuffer);
  }
}
