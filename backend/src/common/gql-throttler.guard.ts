import { type ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

type HttpRequestRecord = Record<string, unknown>;
type HttpResponseRecord = Record<string, unknown>;

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected override getRequestResponse(context: ExecutionContext): {
    req: HttpRequestRecord;
    res: HttpResponseRecord;
  } {
    if (context.getType<string>() === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context).getContext<{
        req: HttpRequestRecord;
        res: HttpResponseRecord;
      }>();
      return { req: gqlCtx.req, res: gqlCtx.res };
    }
    const http = context.switchToHttp();
    return {
      req: http.getRequest<HttpRequestRecord>(),
      res: http.getResponse<HttpRequestRecord>(),
    };
  }
}
