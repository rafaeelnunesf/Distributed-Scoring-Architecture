import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const start = Date.now();

    const buildPayload = (extra: Record<string, unknown> = {}) => {
      const durationMs = Date.now() - start;
      const payload: Record<string, unknown> = {
        correlationId: request.correlationId,
        userId: (request.user as JwtPayload | undefined)?.sub,
        method: request.method,
        path: request.url,
        statusCode: response.statusCode,
        durationMs,
        ...extra,
      };
      const contentLength = request.headers['content-length'];
      if (
        contentLength &&
        ['POST', 'PUT', 'PATCH'].includes(request.method.toUpperCase())
      ) {
        payload.contentLength = contentLength;
      }
      return payload;
    };

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(JSON.stringify(buildPayload()));
        },
        error: (err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'unknown error';
          this.logger.error(
            JSON.stringify(buildPayload({ error: message })),
          );
        },
      }),
    );
  }
}
