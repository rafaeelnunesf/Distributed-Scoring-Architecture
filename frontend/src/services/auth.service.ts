import { clearTokens, setTokens } from '@/lib/token-store';
import { apiClient } from '@/services/api-client';
import type { AuthTokens } from '@/types';

class AuthService {
  async register(email: string, password: string): Promise<{ email: string }> {
    const result = await apiClient.post<{
      email?: string;
      access_token?: string;
      refresh_token?: string;
    }>('/auth/register', { email, password });
    if (result.access_token && result.refresh_token) {
      setTokens(
        { access_token: result.access_token, refresh_token: result.refresh_token },
        email,
      );
    }
    return { email: result.email ?? email };
  }

  async login(email: string, password: string): Promise<{ email: string }> {
    const result = await apiClient.post<{
      email?: string;
      access_token?: string;
      refresh_token?: string;
    }>('/auth/login', { email, password });
    if (result.access_token && result.refresh_token) {
      setTokens(
        { access_token: result.access_token, refresh_token: result.refresh_token },
        email,
      );
    }
    return { email: result.email ?? email };
  }

  async refresh(refreshToken: string): Promise<{ access_token: string }> {
    const result = await apiClient.post<{ access_token: string }>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return result;
  }

  async getMe(): Promise<{ email: string } | null> {
    try {
      return await apiClient.get<{ email: string }>('/auth/me');
    } catch {
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      clearTokens();
    }
  }
}

export const authService = new AuthService();
