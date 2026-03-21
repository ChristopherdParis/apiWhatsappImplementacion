import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ErrorLogService } from '../services/error-log.service';

@Catch()
export class HttpExceptionLoggingFilter implements ExceptionFilter {
  constructor(private readonly errorLogService: ErrorLogService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    void this.errorLogService.logException(
      'HttpExceptionLoggingFilter',
      exception,
      {
        method: request.method,
        path: request.originalUrl,
        query: request.query as Record<string, unknown>,
        body: this.sanitizeBody(request.body),
        statusCode: status,
        response: this.normalizeResponse(exceptionResponse),
      },
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
      error:
        typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? exceptionResponse
          : exception instanceof Error
            ? exception.message
            : 'Internal server error',
    });
  }

  private normalizeResponse(response: unknown) {
    if (typeof response === 'string') {
      return { message: response };
    }

    if (typeof response === 'object' && response !== null) {
      return response as Record<string, unknown>;
    }

    return undefined;
  }

  private sanitizeBody(body: unknown) {
    if (!body || typeof body !== 'object') {
      return body as Record<string, unknown> | undefined;
    }

    return body as Record<string, unknown>;
  }
}
