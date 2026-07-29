import { ExceptionFilter, ArgumentsHost} from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AbstractHttpAdapter } from '@nestjs/core';
import { Request } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string;
  code: string;
  timestamp: string;
  path: string;
  method: string;
  errors?: Record<string, string[]>;
  stack?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly httpAdapter: AbstractHttpAdapter) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let errors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        message = response;
        code = this.getCodeFromStatus(statusCode);
      } else if (typeof response === 'object') {
        const resp = response as Record<string, unknown>;
        message = (resp.message as string) || exception.message;
        code = (resp.code as string) || this.getCodeFromStatus(statusCode);
        errors = resp.errors as Record<string, string[]> | undefined;

        // Handle NestJS class-validator errors
        if (Array.isArray(resp.message)) {
          message = 'Validation failed';
          code = 'VALIDATION_ERROR';
          errors = this.formatValidationErrors(resp.message as string[]);
        }
      }
    }

    const errorResponse: ErrorResponse = {
      statusCode,
      message,
      code,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(errors && { errors }),
    };

    if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    this.logger.error(
      `${request.method} ${request.url} - ${statusCode} ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    this.httpAdapter.reply(ctx.getResponse(), errorResponse, statusCode);
  }

  private getCodeFromStatus(status: HttpStatus): string {
    const codeMap: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
      [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMIT_EXCEEDED',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
    };
    return codeMap[status] || 'UNKNOWN_ERROR';
  }

  private formatValidationErrors(messages: string[]): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};
    for (const msg of messages) {
      const match = msg.match(/^(\w+)\s/);
      const key = match ? match[1].toLowerCase() : 'general';
      if (!formatted[key]) {formatted[key] = [];}
      formatted[key].push(msg);
    }
    return formatted;
  }
}
