import { UnauthorizedException, UseGuards } from '@nestjs/common';
import {
  Args,
  Context,
  Field,
  ID,
  InputType,
  Int,
  Mutation,
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
  BlessingDto,
  NameOfGodDto,
  VerseDto,
} from '../content/content.resolver';
import {
  AdminContentService,
  type ContentStatusFilter,
} from './admin-content.service';

const EMPTY_TEXT_ERROR = 'النص لا يمكن أن يكون فارغاً';

const trimmedTitleOrRefSchema = z.string().trim().min(1, EMPTY_TEXT_ERROR).max(200);

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

const idSchema = z.string().trim().min(1).max(64);

const contentStatusFilterSchema = z
  .enum(['active', 'deleted', 'all'])
  .nullable()
  .optional()
  .transform((value): ContentStatusFilter => value ?? 'active');

export const verseMutationInputSchema = personalizedTextSchema.extend({
  ref: trimmedTitleOrRefSchema,
});

export const nameOfGodMutationInputSchema = personalizedTextSchema.extend({
  title: trimmedTitleOrRefSchema,
});

export const blessingMutationInputSchema = personalizedTextSchema.extend({
  title: trimmedTitleOrRefSchema,
  verseRef: coercedOptionalVerseRefSchema.optional(),
});

@InputType()
export class CreateVerseInput {
  @Field(() => String)
  ref!: string;

  @Field(() => String)
  text!: string;

  @Field(() => String, { nullable: true })
  textFemale?: string | null;
}

@InputType()
export class UpdateVerseInput {
  @Field(() => String)
  ref!: string;

  @Field(() => String)
  text!: string;

  @Field(() => String, { nullable: true })
  textFemale?: string | null;
}

@InputType()
export class CreateNameOfGodInput {
  @Field(() => String)
  title!: string;

  @Field(() => String)
  text!: string;

  @Field(() => String, { nullable: true })
  textFemale?: string | null;
}

@InputType()
export class UpdateNameOfGodInput {
  @Field(() => String)
  title!: string;

  @Field(() => String)
  text!: string;

  @Field(() => String, { nullable: true })
  textFemale?: string | null;
}

@InputType()
export class CreateBlessingInput {
  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  verseRef?: string | null;

  @Field(() => String)
  text!: string;

  @Field(() => String, { nullable: true })
  textFemale?: string | null;
}

@InputType()
export class UpdateBlessingInput {
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
export class AdminContentResolver {
  constructor(private readonly adminContentService: AdminContentService) {}

  @Query(() => Int)
  adminContentVersion(): number {
    return this.adminContentService.getContentVersion();
  }

  @Query(() => [VerseDto])
  adminVerses(
    @Args(
      'status',
      { type: () => String, nullable: true, defaultValue: 'active' },
      new ZodValidationPipe(contentStatusFilterSchema),
    )
    status: ContentStatusFilter,
  ): VerseDto[] {
    return this.adminContentService.listVerses(status);
  }

  @Query(() => [NameOfGodDto])
  adminNamesOfGod(
    @Args(
      'status',
      { type: () => String, nullable: true, defaultValue: 'active' },
      new ZodValidationPipe(contentStatusFilterSchema),
    )
    status: ContentStatusFilter,
  ): NameOfGodDto[] {
    return this.adminContentService.listNamesOfGod(status);
  }

  @Query(() => [BlessingDto])
  adminBlessings(
    @Args(
      'status',
      { type: () => String, nullable: true, defaultValue: 'active' },
      new ZodValidationPipe(contentStatusFilterSchema),
    )
    status: ContentStatusFilter,
  ): BlessingDto[] {
    return this.adminContentService.listBlessings(status);
  }

  @Mutation(() => VerseDto)
  createVerse(
    @Args('input', new ZodValidationPipe(verseMutationInputSchema))
    input: CreateVerseInput,
    @Context() ctx: { req: AdminRequest },
  ): VerseDto {
    return this.adminContentService.createVerse(requireActorEmail(ctx), input);
  }

  @Mutation(() => VerseDto)
  updateVerse(
    @Args('id', { type: () => ID }, new ZodValidationPipe(idSchema))
    id: string,
    @Args('input', new ZodValidationPipe(verseMutationInputSchema))
    input: UpdateVerseInput,
    @Args('expectedVersion', { type: () => Int, nullable: true })
    expectedVersion: number | null | undefined,
    @Context() ctx: { req: AdminRequest },
  ): VerseDto {
    return this.adminContentService.updateVerse(requireActorEmail(ctx), id, input, expectedVersion);
  }

  @Mutation(() => NameOfGodDto)
  createNameOfGod(
    @Args('input', new ZodValidationPipe(nameOfGodMutationInputSchema))
    input: CreateNameOfGodInput,
    @Context() ctx: { req: AdminRequest },
  ): NameOfGodDto {
    return this.adminContentService.createNameOfGod(requireActorEmail(ctx), input);
  }

  @Mutation(() => NameOfGodDto)
  updateNameOfGod(
    @Args('id', { type: () => ID }, new ZodValidationPipe(idSchema))
    id: string,
    @Args('input', new ZodValidationPipe(nameOfGodMutationInputSchema))
    input: UpdateNameOfGodInput,
    @Args('expectedVersion', { type: () => Int, nullable: true })
    expectedVersion: number | null | undefined,
    @Context() ctx: { req: AdminRequest },
  ): NameOfGodDto {
    return this.adminContentService.updateNameOfGod(requireActorEmail(ctx), id, input, expectedVersion);
  }

  @Mutation(() => BlessingDto)
  createBlessing(
    @Args('input', new ZodValidationPipe(blessingMutationInputSchema))
    input: CreateBlessingInput,
    @Context() ctx: { req: AdminRequest },
  ): BlessingDto {
    return this.adminContentService.createBlessing(requireActorEmail(ctx), input);
  }

  @Mutation(() => BlessingDto)
  updateBlessing(
    @Args('id', { type: () => ID }, new ZodValidationPipe(idSchema))
    id: string,
    @Args('input', new ZodValidationPipe(blessingMutationInputSchema))
    input: UpdateBlessingInput,
    @Args('expectedVersion', { type: () => Int, nullable: true })
    expectedVersion: number | null | undefined,
    @Context() ctx: { req: AdminRequest },
  ): BlessingDto {
    return this.adminContentService.updateBlessing(requireActorEmail(ctx), id, input, expectedVersion);
  }

  @Mutation(() => Boolean)
  softDeleteContent(
    @Args('kind', { type: () => String }, new ZodValidationPipe(contentKindSchema))
    kind: ContentKind,
    @Args('id', { type: () => ID }, new ZodValidationPipe(idSchema))
    id: string,
    @Context() ctx: { req: AdminRequest },
  ): boolean {
    return this.adminContentService.softDeleteContent(requireActorEmail(ctx), kind, id);
  }

  @Mutation(() => Boolean)
  restoreContent(
    @Args('kind', { type: () => String }, new ZodValidationPipe(contentKindSchema))
    kind: ContentKind,
    @Args('id', { type: () => ID }, new ZodValidationPipe(idSchema))
    id: string,
    @Context() ctx: { req: AdminRequest },
  ): boolean {
    return this.adminContentService.restoreContent(requireActorEmail(ctx), kind, id);
  }
}
