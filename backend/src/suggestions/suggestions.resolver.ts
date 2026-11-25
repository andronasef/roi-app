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
  Resolver,
} from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import {
  type ContentKind,
  type SubmitSuggestionInput as SharedSubmitSuggestionInput,
  submitSuggestionInputSchema,
} from '@roi/shared';
import {
  type GoogleAuthenticatedRequest,
  GoogleAuthGuard,
} from '../common/google-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SuggestionsService } from './suggestions.service';

@InputType()
export class SubmitSuggestionInput implements SharedSubmitSuggestionInput {
  @Field(() => String)
  kind!: ContentKind;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  text!: string;

  @Field(() => String, { nullable: true })
  textFemale?: string | null;

  @Field(() => String, { nullable: true })
  verseRef?: string | null;
}

@ObjectType()
export class SuggestionReceiptDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  status!: string;

  @Field(() => Float)
  createdAt!: number;

  @Field(() => Int)
  remainingToday!: number;
}

@Resolver()
export class SuggestionsResolver {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @UseGuards(GoogleAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Mutation(() => SuggestionReceiptDto)
  submitSuggestion(
    @Args('input', new ZodValidationPipe(submitSuggestionInputSchema))
    input: SubmitSuggestionInput,
    @Context() ctx: { req: GoogleAuthenticatedRequest },
  ): SuggestionReceiptDto {
    const googleUser = ctx.req.googleUser;
    if (!googleUser) {
      throw new UnauthorizedException('GOOGLE_TOKEN_REQUIRED');
    }
    return this.suggestionsService.submitSuggestion(googleUser, input);
  }
}
