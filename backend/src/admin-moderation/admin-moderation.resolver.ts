import { UnauthorizedException, UseGuards } from '@nestjs/common';
import {
  Args,
  Context,
  Field,
  Float,
  ID,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import {
  type ContentKind,
  contentKindSchema,
  personalizedTextSchema,
} from '@roi/shared';
import { z } from 'zod';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import type { AdminRequest } from '../admin-auth/admin-auth.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  AdminModerationService,
  type SuggestionStatusFilter,
} from './admin-moderation.service';

const EMPTY_TEXT_ERROR = 'النص لا يمكن أن يكون فارغاً';

const idSchema = z.string().trim().min(1).max(64);
const trimmedTitleSchema = z.string().trim().min(1, EMPTY_TEXT_ERROR).max(200);

const coercedOptionalVerseRefSchema = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      return trimmed.length === 0 ? null : trimmed;
    }
    return val ?? null;
  },
  z.string().trim().min(1, EMPTY_TEXT_ERROR).max(200).nullable(),
);

const suggestionStatusFilterSchema = z
  .enum(['pending', 'accepted', 'rejected', 'all'])
  .nullable()
  .optional()
  .transform((value): SuggestionStatusFilter => value ?? 'pending');

const rejectNoteSchema = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      return trimmed.length === 0 ? null : trimmed;
    }
    return val ?? null;
  },
  z.string().trim().max(1000).nullable().optional(),
);

export const acceptSuggestionInputSchema = personalizedTextSchema.extend({
  kind: contentKindSchema,
  title: trimmedTitleSchema,
  verseRef: coercedOptionalVerseRefSchema.optional(),
});

@ObjectType()
export class SubmitterStatsDto {
  @Field(() => Int)
  pendingCount!: number;

  @Field(() => Int)
  acceptedCount!: number;

  @Field(() => Int)
  rejectedCount!: number;
}

@ObjectType()
export class AdminSuggestionDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  kind!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  text!: string;

  @Field(() => String, { nullable: true })
  textFemale?: string | null;

  @Field(() => String, { nullable: true })
  verseRef?: string | null;

  @Field(() => String)
  status!: string;

  @Field(() => String, { nullable: true })
  moderationNote?: string | null;

  @Field(() => String)
  googleSub!: string;

  @Field(() => String)
  email!: string;

  @Field(() => Float)
  createdAt!: number;

  @Field(() => Float)
  updatedAt!: number;

  @Field(() => SubmitterStatsDto)
  submitterStats!: SubmitterStatsDto;
}

@InputType()
export class AcceptSuggestionInput {
  @Field(() => String)
  kind!: ContentKind;

  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  verseRef?: string | null;

  @Field(() => String)
  text!: string;

  @Field(() => String, { nullable: true })
  textFemale?: string | null;
}

function requireActorEmail(ctx: { req: AdminRequest }): string {
  const email = ctx.req.adminUser?.email;
  if (!email) {
    throw new UnauthorizedException('ADMIN_SESSION_REQUIRED');
  }
  return email;
}

@UseGuards(AdminAuthGuard)
@Resolver()
export class AdminModerationResolver {
  constructor(private readonly moderationService: AdminModerationService) {}

  @Query(() => [AdminSuggestionDto])
  adminSuggestions(
    @Args(
      'status',
      { type: () => String, nullable: true, defaultValue: 'pending' },
      new ZodValidationPipe(suggestionStatusFilterSchema),
    )
    status: SuggestionStatusFilter,
  ): AdminSuggestionDto[] {
    return this.moderationService.listSuggestions(status);
  }

  @Query(() => AdminSuggestionDto)
  adminSuggestion(
    @Args('id', { type: () => ID }, new ZodValidationPipe(idSchema))
    id: string,
  ): AdminSuggestionDto {
    return this.moderationService.getSuggestion(id);
  }

  @Mutation(() => AdminSuggestionDto)
  acceptSuggestion(
    @Args('id', { type: () => ID }, new ZodValidationPipe(idSchema))
    id: string,
    @Args('input', new ZodValidationPipe(acceptSuggestionInputSchema))
    input: AcceptSuggestionInput,
    @Context() ctx: { req: AdminRequest },
  ): AdminSuggestionDto {
    return this.moderationService.acceptSuggestion(requireActorEmail(ctx), id, input);
  }

  @Mutation(() => AdminSuggestionDto)
  rejectSuggestion(
    @Args('id', { type: () => ID }, new ZodValidationPipe(idSchema))
    id: string,
    @Args('note', { type: () => String, nullable: true }, new ZodValidationPipe(rejectNoteSchema))
    note: string | null | undefined,
    @Context() ctx: { req: AdminRequest },
  ): AdminSuggestionDto {
    return this.moderationService.rejectSuggestion(requireActorEmail(ctx), id, note);
  }
}
