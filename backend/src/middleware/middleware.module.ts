import { NestModule, MiddlewareConsumer, Module } from '@nestjs/common';

import { RequestIdMiddleware } from './request-id.middleware';

@Module({})
export class MiddlewareModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
