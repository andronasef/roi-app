import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

/**
 * Reusable NestJS pipe validating incoming arguments against a Zod schema
 * and surfacing the first Zod issue message (e.g. Arabic validation errors).
 */
@Injectable()
export class ZodValidationPipe<TOutput = unknown> implements PipeTransform<unknown, TOutput> {
  constructor(private readonly schema: ZodType<TOutput>) {}

  transform(value: unknown): TOutput {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: result.error.issues[0]?.message ?? 'INVALID_INPUT',
        issues: result.error.issues,
      });
    }
    return result.data;
  }
}
