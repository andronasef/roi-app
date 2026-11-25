import { Global, Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import { type BackendEnv, loadEnv } from '../config/env';
import { resolveBackendPath } from '../config/paths';
import { openBackendDatabase, type BackendDatabaseHandle } from './client';

export const BACKEND_ENV = Symbol('BACKEND_ENV');
export const SQLITE_DB = Symbol('SQLITE_DB');
export const DRIZZLE_DB = Symbol('DRIZZLE_DB');
const BACKEND_DB_HANDLE = Symbol('BACKEND_DB_HANDLE');

@Global()
@Module({
  providers: [
    {
      provide: BACKEND_ENV,
      useFactory: (): BackendEnv => loadEnv(),
    },
    {
      provide: BACKEND_DB_HANDLE,
      inject: [BACKEND_ENV],
      useFactory: (env: BackendEnv): BackendDatabaseHandle =>
        openBackendDatabase(env.DATA_DIR, resolveBackendPath('drizzle')),
    },
    {
      provide: SQLITE_DB,
      inject: [BACKEND_DB_HANDLE],
      useFactory: (handle: BackendDatabaseHandle) => handle.sqlite,
    },
    {
      provide: DRIZZLE_DB,
      inject: [BACKEND_DB_HANDLE],
      useFactory: (handle: BackendDatabaseHandle) => handle.db,
    },
  ],
  exports: [BACKEND_ENV, SQLITE_DB, DRIZZLE_DB],
})
export class DrizzleModule implements OnModuleDestroy {
  constructor(
    @Inject(BACKEND_DB_HANDLE)
    private readonly handle: BackendDatabaseHandle,
  ) {}

  onModuleDestroy(): void {
    this.handle.close();
  }
}
