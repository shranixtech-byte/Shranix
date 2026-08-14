import { resolve } from 'node:path';

import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import appConfig from './app.config';
import databaseConfig from './database.config';
import { validateEnvironment } from './env.validation';
import loggerConfig from './logger.config';

// This file is three levels below the repository root in both src/ and dist/.
// Use absolute paths so configuration is independent of the package's launch directory.
const projectRoot = resolve(__dirname, '../../..');

/**
 * Load environment files in priority order (later files override earlier ones).
 * - development: .env.local → .env → .env.development
 * - staging:     .env.local → .env → .env.staging
 * - production:  .env.local → .env → .env.production
 * - test:        .env.local → .env → .env.test
 * This guarantees each environment has separate credentials and staging can
 * never accidentally pick up production values from a shared file (17.2).
 */
function envFilesFor(nodeEnv: string): string[] {
  const envFile = `.env.${nodeEnv}`;
  return ['.env.local', '.env', envFile].map((file) => resolve(projectRoot, file));
}

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFilesFor(process.env.NODE_ENV || 'development'),
      validate: validateEnvironment,
      load: [appConfig, databaseConfig, loggerConfig],
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}
