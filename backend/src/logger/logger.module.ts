import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
                  ignore: 'pid,hostname',
                },
              }
            : undefined,
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
            headers: { 'user-agent': req.headers?.['user-agent'], 'x-request-id': req.headers?.['x-request-id'] },
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },
        autoLogging: {
          ignore: (req) => req.url === '/health' || req.url?.startsWith('/health/') || false,
        },
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
