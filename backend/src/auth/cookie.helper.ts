import type { Response } from 'express';
import { randomUUID } from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
};
const ACCESS_MAX_AGE = 15 * 60; // 15 minutes
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // 7 days
const CSRF_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie('access_token', accessToken, {
    ...COOKIE_OPTS,
    path: '/',
    maxAge: ACCESS_MAX_AGE * 1000,
  });
  res.cookie('refresh_token', refreshToken, {
    ...COOKIE_OPTS,
    path: '/api/v1/auth',
    maxAge: REFRESH_MAX_AGE * 1000,
  });
  const csrfToken = randomUUID();
  res.cookie('csrf_token', csrfToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: CSRF_MAX_AGE * 1000,
  });
}

export function setAccessCookie(res: Response, accessToken: string): void {
  res.cookie('access_token', accessToken, {
    ...COOKIE_OPTS,
    path: '/',
    maxAge: ACCESS_MAX_AGE * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.cookie('access_token', '', { path: '/', maxAge: 0 });
  res.cookie('refresh_token', '', { path: '/api/v1/auth', maxAge: 0 });
  res.cookie('csrf_token', '', { path: '/', maxAge: 0 });
}
