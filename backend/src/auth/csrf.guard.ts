import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    const path = request.path ?? '';
    const normalizedPath = path.replace(/^\/api\/v1/, '') || '/';
    if (normalizedPath === '/auth/login' || normalizedPath === '/auth/register') {
      return true;
    }

    const csrfCookie = request.cookies?.csrf_token;
    const csrfHeader = request.headers['x-csrf-token'] as string | undefined;

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      throw new ForbiddenException('Invalid or missing CSRF token');
    }

    return true;
  }
}
