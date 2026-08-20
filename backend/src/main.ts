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
import { API_PREFIX, API_VERSION, SWAGGER_DESCRIPTION, APP_NAME } from './constants/app.constants';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    abortOnError: false,
  });

  const logger = new Logger('Bootstrap');

  // ── Security ──────────────────────────────────────────
  app.use(helmet());
  app.enableCors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:4000,tauri://localhost').split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-csrf-token'],
  });

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
