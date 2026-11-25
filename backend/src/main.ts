import 'reflect-metadata';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { type BackendEnv, loadEnv } from './config/env';
import { resolveAdminDistDir } from './config/paths';

// Minimal structural types: `express` is a transitive dep without its own types here.
interface SpaRequest {
  path: string;
}
interface SpaResponse {
  setHeader(name: string, value: string): unknown;
  sendFile(path: string): unknown;
}
type SpaNext = () => void;

/**
 * Configure Express/NestJS HTTP security, proxy, CORS, payload, and shutdown settings.
 */
export function configureApp(
  app: NestExpressApplication,
  env: BackendEnv,
  adminDistDir: string | null = resolveAdminDistDir() ?? null,
): void {
  const isProd = env.NODE_ENV === 'production';
  const allowedOrigins = new Set(env.ADMIN_ORIGINS);

  app.set('trust proxy', 1);
  app.use(cookieParser());
  app.use(
    helmet(
      isProd
        ? {
            contentSecurityPolicy: {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", 'https://accounts.google.com/gsi/client'],
                frameSrc: ["'self'", 'https://accounts.google.com/gsi/'],
                connectSrc: ["'self'", 'https://accounts.google.com/gsi/'],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com/gsi/style'],
                imgSrc: ["'self'", 'data:', 'https://*.googleusercontent.com'],
                fontSrc: ["'self'", 'data:'],
              },
            },
            // GIS popup sign-in needs window.opener; default `same-origin` severs it.
            crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
          }
        : { contentSecurityPolicy: false },
    ),
  );
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
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Roi-Admin', 'Apollo-Require-Preflight'],
  });
  app.useBodyParser('json', { limit: '100kb' });
  app.enableShutdownHooks();

  if (adminDistDir) {
    mountAdminSpa(app, adminDistDir);
  }
}

/**
 * Serve the built admin SPA at /admin on the same origin as /graphql (D-14).
 * Express 5 / path-to-regexp v8: wildcards must be named (`{*splat}`).
 */
function mountAdminSpa(app: NestExpressApplication, adminDistDir: string): void {
  app.useStaticAssets(adminDistDir, {
    prefix: '/admin',
    index: false,
    redirect: false,
    maxAge: '1y',
    immutable: true,
  });

  const indexFile = join(adminDistDir, 'index.html');
  const sendIndex = (_req: SpaRequest, res: SpaResponse): void => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(indexFile);
  };
  const http = app.getHttpAdapter() as unknown as {
    get(path: string, handler: (req: SpaRequest, res: SpaResponse, next: SpaNext) => void): void;
  };
  http.get('/admin', sendIndex);
  http.get('/admin/{*splat}', (req: SpaRequest, res: SpaResponse, next: SpaNext) => {
    // Dotted paths are asset requests: let missing chunks 404 instead of returning HTML.
    if (req.path.includes('.')) {
      next();
      return;
    }
    sendIndex(req, res);
  });
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
