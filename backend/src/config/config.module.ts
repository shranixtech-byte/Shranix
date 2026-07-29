import { resolve } from 'node:path';

import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import appConfig from './app.config';
import databaseConfig from './database.config';
import loggerConfig from './logger.config';

// This file is three levels below the repository root in both src/ and dist/.
// Use absolute paths so configuration is independent of the package's launch directory.
const projectRoot = resolve(__dirname, '../../..');
const envFilePath = ['.env.local', '.env', '.env.development'].map((file) =>
  resolve(projectRoot, file),
);

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath,
      load: [appConfig, databaseConfig, loggerConfig],
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}
