import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const id =
      (req.headers['x-correlation-id'] as string) || randomUUID();
    req.correlationId = id;
    res.setHeader('X-Correlation-ID', id);
    next();
  }
}
