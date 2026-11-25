import { Inject, UseGuards } from '@nestjs/common';
import { Args, Field, Float, ID, Int, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { and, desc, eq, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import type { BackendDatabase } from '../db/client';
import { DRIZZLE_DB } from '../db/drizzle.module';
import { auditLog } from '../db/schema';

const optionalFilterSchema = z
  .string()
  .trim()
  .max(100)
  .nullable()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

const limitSchema = z
  .number()
  .int()
  .min(1)
  .max(200)
  .nullable()
  .optional()
  .transform((value) => value ?? 50);

const offsetSchema = z
  .number()
  .int()
  .min(0)
  .max(100_000)
  .nullable()
  .optional()
  .transform((value) => value ?? 0);

@ObjectType()
export class AuditLogDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  actorEmail!: string;

  @Field(() => String)
  action!: string;

  @Field(() => String)
  entityType!: string;

  @Field(() => String)
  entityId!: string;

  @Field(() => Int)
  contentVersion!: number;

  @Field(() => String)
  summaryJson!: string;

  @Field(() => Float)
  createdAt!: number;
}

@UseGuards(AdminAuthGuard)
@Resolver()
export class AdminAuditResolver {
  constructor(@Inject(DRIZZLE_DB) private readonly db: BackendDatabase) {}

  @Query(() => [AuditLogDto])
  adminAuditLogs(
    @Args(
      'action',
      { type: () => String, nullable: true },
      new ZodValidationPipe(optionalFilterSchema),
    )
    action: string | null,
    @Args(
      'entityType',
      { type: () => String, nullable: true },
      new ZodValidationPipe(optionalFilterSchema),
    )
    entityType: string | null,
    @Args(
      'limit',
      { type: () => Int, nullable: true, defaultValue: 50 },
      new ZodValidationPipe(limitSchema),
    )
    limit: number,
    @Args(
      'offset',
      { type: () => Int, nullable: true, defaultValue: 0 },
      new ZodValidationPipe(offsetSchema),
    )
    offset: number,
  ): AuditLogDto[] {
    const conditions: SQL[] = [];
    if (action) {
      conditions.push(eq(auditLog.action, action));
    }
    if (entityType) {
      conditions.push(eq(auditLog.entityType, entityType));
    }

    const baseQuery = this.db.select().from(auditLog);
    const filteredQuery =
      conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

    return filteredQuery
      .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
      .limit(limit)
      .offset(offset)
      .all();
  }
}
