import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloArmor } from '@escape.tech/graphql-armor';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ThrottlerModule } from '@nestjs/throttler';
import { loadEnv } from './config/env';
import { SnapshotController } from './content/snapshot.controller';
import { SnapshotService } from './content/snapshot.service';
import { DrizzleModule } from './db/drizzle.module';
import { HealthController } from './health/health.controller';

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
          context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
          validationRules: [...protection.validationRules],
          plugins: [
            ...protection.plugins,
            ...(isProd ? [ApolloServerPluginLandingPageDisabled()] : []),
          ],
        };
      },
    }),
  ],
  controllers: [SnapshotController, HealthController],
  providers: [SnapshotService],
})
export class AppModule {}
