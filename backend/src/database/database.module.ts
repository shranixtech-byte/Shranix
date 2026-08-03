import { Module, Global, OnModuleDestroy } from '@nestjs/common';
import { loadDatabaseConfig, createDatabaseClient, closeDatabaseClient } from '@shranix/database';

import { DatabaseService } from './database.service';

@Global()
@Module({
  providers: [
    {
      provide: 'DATABASE_CONFIG',
      useFactory: () => loadDatabaseConfig(),
    },
    {
      provide: 'DATABASE_CLIENT',
      useFactory: () => {
        const config = loadDatabaseConfig();
        return createDatabaseClient(config);
      },
    },
    DatabaseService,
  ],
  exports: ['DATABASE_CONFIG', 'DATABASE_CLIENT', DatabaseService],
})
export class DatabaseModule implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    const config = loadDatabaseConfig();
    await closeDatabaseClient(config);
  }
}
