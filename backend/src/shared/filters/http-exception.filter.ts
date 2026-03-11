import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = isHttpException
      ? exception.getResponse()
      : { message: 'Internal server error' };

    const message =
      typeof responseBody === 'string'
        ? responseBody
        : this.extractMessage(responseBody);

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private extractMessage(responseBody: unknown): string {
    if (
      typeof responseBody === 'object' &&
      responseBody !== null &&
      'message' in responseBody
    ) {
      const value = (responseBody as { message: unknown }).message;
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      if (typeof value === 'string') {
        return value;
      }
    }
    return 'Unexpected error';
  }
}
