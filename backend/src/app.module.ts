import type { ApolloServerPlugin } from '@apollo/server';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloArmor } from '@escape.tech/graphql-armor';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ThrottlerModule } from '@nestjs/throttler';
import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_OAUTH_CLIENT, GoogleAuthGuard } from './common/google-auth.guard';
import { GqlThrottlerGuard } from './common/gql-throttler.guard';
import { loadEnv } from './config/env';
import { ContentResolver } from './content/content.resolver';
import { ContentService } from './content/content.service';
import { SnapshotController } from './content/snapshot.controller';
import { SnapshotService } from './content/snapshot.service';
import { DrizzleModule } from './db/drizzle.module';
import { HealthController } from './health/health.controller';
import { SuggestionsResolver } from './suggestions/suggestions.resolver';
import { SuggestionsService } from './suggestions/suggestions.service';

/**
 * Preserve HTTP 429 status on GraphQL responses when `GqlThrottlerGuard` rejects
 * a request (`@nestjs/apollo` resets execution error HTTP status to 200 by default).
 */
function createThrottlerHttpStatusPlugin(): ApolloServerPlugin {
  return {
    async requestDidStart() {
      return {
        async willSendResponse(requestContext) {
          const body = requestContext.response?.body;
          if (body?.kind !== 'single') {
            return;
          }
          const errors = body.singleResult?.errors;
          const isThrottled = errors?.some((err) => err.extensions?.status === 429);
          if (isThrottled && requestContext.response?.http) {
            requestContext.response.http.status = 429;
          }
        },
      };
    },
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
    DrizzleModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useFactory: () => {
        const env = loadEnv();
        const isProd = env.NODE_ENV === 'production';
        const armor = new ApolloArmor({
          maxDepth: { enabled: true, n: 6, ignoreIntrospection: !isProd },
          costLimit: { enabled: true, maxCost: 5000 },
          maxAliases: { enabled: true, n: 5 },
          maxDirectives: { enabled: true, n: 5 },
          maxTokens: { enabled: true, n: 500 },
          blockFieldSuggestion: { enabled: true },
        });
        const protection = armor.protect();

        return {
          autoSchemaFile: true,
          sortSchema: true,
          graphiql: !isProd,
          introspection: !isProd,
          includeStacktraceInErrorResponses: !isProd,
          preserveHttpStatusForExecutionErrors: false,
          formatError: (formattedError) => {
            if (formattedError.extensions?.status === 429) {
              return {
                ...formattedError,
                extensions: {
                  ...formattedError.extensions,
                  code: 'TOO_MANY_REQUESTS',
                },
              };
            }
            return formattedError;
          },
          context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
          validationRules: [...protection.validationRules],
          plugins: [
            ...protection.plugins,
            createThrottlerHttpStatusPlugin(),
            ...(isProd ? [ApolloServerPluginLandingPageDisabled()] : []),
          ],
        };
      },
    }),
  ],
  controllers: [SnapshotController, HealthController],
  providers: [
    SnapshotService,
    ContentService,
    ContentResolver,
    {
      provide: GOOGLE_OAUTH_CLIENT,
      useFactory: () => new OAuth2Client(),
    },
    GoogleAuthGuard,
    SuggestionsService,
    SuggestionsResolver,
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard,
    },
  ],
})
export class AppModule {}
