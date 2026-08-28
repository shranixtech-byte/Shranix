import 'reflect-metadata';

import { Logger, VersioningType, ValidationPipe } from '@nestjs/common';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { SensitiveCacheControlMiddleware } from './common/middleware/sensitive-cache-control.middleware';
import {
  HELMET_OPTIONS,
  PERMISSIONS_POLICY,
  getCorsOptions,
} from './common/utils/security-headers';
import { API_PREFIX, API_VERSION, SWAGGER_DESCRIPTION, APP_NAME } from './constants/app.constants';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';

async function bootstrap() {
  // ── Auto-migration: run drizzle-kit push for SQLite offline mode ──
  const provider = process.env.DATABASE_PROVIDER || 'sqlite';
  if (provider === 'sqlite') {
    const logger = new Logger('Migrate');
    try {
      const { execSync } = await import('child_process');
      logger.log('Running auto-migration (drizzle-kit push)...');
      execSync('npx drizzle-kit push --config=./drizzle.config.ts', {
        cwd: process.cwd().includes('backend')
          ? process.cwd().replace(/backend$/, 'database')
          : undefined,
        timeout: 60000,
        stdio: 'pipe',
      });
      logger.log('Auto-migration completed successfully');
    } catch (err) {
      const msg = (err as Error).message || String(err);
      // drizzle-kit push may fail if schema is already up to date — that's fine
      if (msg.includes('Already up to date') || msg.includes('No changes')) {
        logger.log('Database schema is up to date');
      } else {
        logger.warn(`Auto-migration warning: ${msg.slice(0, 500)}`);
      }
    }
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    abortOnError: false,
  });

  const logger = new Logger('Bootstrap');

  // ── Security Headers (H14) ─────────────────────────────
  app.use(helmet(HELMET_OPTIONS));

  // H14: Permissions-Policy (not provided by Helmet)
  app.use((_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
    next();
  });

  // ── CORS (H14: centralized configuration) ────────────────
  app.enableCors(getCorsOptions());

  // ── Request ID / correlation ID (17.23) ─────────────────
  const requestIdMiddleware = new RequestIdMiddleware();
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) =>
    requestIdMiddleware.use(req, res, next),
  );

  // ── Request parsing & limits ──────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(compression());
  app.use(cookieParser());

  // ── Cache-Control for sensitive endpoints (H14) ────────
  app.use(new SensitiveCacheControlMiddleware().use.bind(new SensitiveCacheControlMiddleware()));

  // ── Global Prefix & Versioning ─────────────────────────
  app.setGlobalPrefix(API_PREFIX, {
    exclude: ['health', 'health/live', 'health/ready'],
  });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ── Global Pipes ───────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // ── Global Interceptors ────────────────────────────────
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(),
    new TimeoutInterceptor(),
  );

  // ── Global Exception Filter ────────────────────────────
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new GlobalExceptionFilter(httpAdapter));

  // ── Swagger Documentation ──────────────────────────────
  const swaggerEnabled = process.env.SWAGGER_ENABLED !== 'false';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle(APP_NAME)
      .setDescription(SWAGGER_DESCRIPTION)
      .setVersion(API_VERSION)
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .addServer(`http://localhost:${process.env.APP_PORT || 4001}`, 'Local Development')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(process.env.SWAGGER_PATH || 'api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
    logger.log(`Swagger docs available at /${process.env.SWAGGER_PATH || 'api/docs'}`);
  }

  // ── Graceful Shutdown ──────────────────────────────────
  app.enableShutdownHooks();

  // ── Start Server ───────────────────────────────────────
  const port = process.env.APP_PORT || 4001;
  await app.listen(port);
  logger.log(`Application is running on http://localhost:${port}/${API_PREFIX}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap().catch((err) => {
  // Use console.error here because bufferLogs:true may suppress NestJS Logger
  console.error('Failed to start application:');
  console.error(err.stack || err.message || err);
  process.exit(1);
});
