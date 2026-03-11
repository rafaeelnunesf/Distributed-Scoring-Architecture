import type { AuthTokens } from '@/types';

const CSRF_COOKIE_NAME = 'csrf_token';

let mockAccessToken: string | null = null;

function canUseDocument(): boolean {
  return typeof document !== 'undefined';
}

function isMockApi(): boolean {
  return typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MOCK_API === 'true';
}

export function getCsrfToken(): string | null {
  if (!canUseDocument()) return null;
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + CSRF_COOKIE_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function setTokens(tokens: AuthTokens, _email?: string): void {
  if (isMockApi()) {
    mockAccessToken = tokens.access_token;
  }
}

export function setAccessToken(_accessToken: string): void {
  // No-op: access token is in httpOnly cookie
}

export function getAccessToken(): string | null {
  if (isMockApi()) return mockAccessToken;
  return null;
}

export function getRefreshToken(): string | null {
  // Not readable when using httpOnly cookies
  return null;
}

export function getStoredEmail(): string | null {
  return null;
}

export function clearTokens(): void {
  if (isMockApi()) mockAccessToken = null;
}
