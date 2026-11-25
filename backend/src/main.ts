import 'reflect-metadata';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { type BackendEnv, loadEnv } from './config/env';

/**
 * Configure Express/NestJS HTTP security, proxy, CORS, payload, and shutdown settings.
 */
export function configureApp(app: NestExpressApplication, env: BackendEnv): void {
  const isProd = env.NODE_ENV === 'production';
  const allowedOrigins = new Set(env.ADMIN_ORIGINS);

  app.set('trust proxy', 1);
  app.use(helmet(isProd ? {} : { contentSecurityPolicy: false }));
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow native mobile clients and curl requests that omit Origin.
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, allowedOrigins.has(origin));
    },
  });
  app.useBodyParser('json', { limit: '100kb' });
  app.enableShutdownHooks();
}

/**
 * CJS-and-ESM-safe entrypoint check so `dist/main.cjs` boots on direct execution
 * while importing `configureApp` in Vitest or library modules never auto-listens.
 */
export function isMainEntrypoint(): boolean {
  if (process.env.VITEST === 'true') {
    return false;
  }
  if (typeof require !== 'undefined' && typeof module !== 'undefined') {
    return require.main === module;
  }
  try {
    if (
      typeof import.meta !== 'undefined' &&
      typeof import.meta.url === 'string' &&
      process.argv[1]
    ) {
      return resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);
    }
  } catch {
    // Ignore when import.meta.url is unavailable in bundled CJS contexts.
  }
  return false;
}

export async function bootstrap(): Promise<NestExpressApplication> {
  const env = loadEnv(process.env);
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app, env);
  await app.listen(env.PORT);
  return app;
}

if (isMainEntrypoint()) {
  bootstrap().catch((error: unknown) => {
    process.stderr.write(
      `Bootstrap failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
