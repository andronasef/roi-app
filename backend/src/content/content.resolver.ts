import { BadRequestException } from '@nestjs/common';
import { Args, Field, Float, ID, Int, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { z } from 'zod';
import { ContentService } from './content.service';

const sinceVersionSchema = z.number().int().nonnegative('sinceVersion must be a non-negative integer');

@ObjectType()
export class VerseDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  ref!: string;

  @Field(() => String)
  text!: string;

  @Field(() => String, { nullable: true })
  textFemale?: string | null;

  @Field(() => Int)
  version!: number;

  @Field(() => Int, { nullable: true })
  sortOrder?: number | null;

  @Field(() => [String], { nullable: true })
  tags?: string[] | null;

  @Field(() => Float)
  createdAt!: number;

  @Field(() => Float)
  updatedAt!: number;

  @Field(() => Float, { nullable: true })
  deletedAt!: number | null;
}

@ObjectType()
export class NameOfGodDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  text!: string;

  @Field(() => String, { nullable: true })
  textFemale?: string | null;

  @Field(() => Int)
  version!: number;

  @Field(() => Int, { nullable: true })
  sortOrder?: number | null;

  @Field(() => [String], { nullable: true })
  tags?: string[] | null;

  @Field(() => Float)
  createdAt!: number;

  @Field(() => Float)
  updatedAt!: number;

  @Field(() => Float, { nullable: true })
  deletedAt!: number | null;
}

@ObjectType()
export class BlessingDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  verseRef?: string | null;

  @Field(() => String)
  text!: string;

  @Field(() => String, { nullable: true })
  textFemale?: string | null;

  @Field(() => Int)
  version!: number;

  @Field(() => Int, { nullable: true })
  sortOrder?: number | null;

  @Field(() => [String], { nullable: true })
  tags?: string[] | null;

  @Field(() => Float)
  createdAt!: number;

  @Field(() => Float)
  updatedAt!: number;

  @Field(() => Float, { nullable: true })
  deletedAt!: number | null;
}

@ObjectType()
export class ContentDeltaDto {
  @Field(() => Int)
  contentVersion!: number;

  @Field(() => [VerseDto])
  verses!: VerseDto[];

  @Field(() => [NameOfGodDto])
  namesOfGod!: NameOfGodDto[];

  @Field(() => [BlessingDto])
  blessings!: BlessingDto[];
}

@Resolver()
export class ContentResolver {
  constructor(private readonly contentService: ContentService) {}

  @Query(() => ContentDeltaDto)
  contentDelta(
    @Args('sinceVersion', { type: () => Int }) sinceVersion: number,
  ): ContentDeltaDto {
    const parsed = sinceVersionSchema.safeParse(sinceVersion);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'sinceVersion must be a non-negative integer',
      );
    }
    return this.contentService.getContentDelta(parsed.data);
  }
}
