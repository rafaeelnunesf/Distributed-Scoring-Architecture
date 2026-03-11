import { MockApiError, isMockApiEnabled, mockRequest } from '@/lib/mock-api';
import { getAccessToken, getCsrfToken } from '@/lib/token-store';

type RequestMethod = 'GET' | 'POST' | 'UPLOAD';

interface RequestOptions {
  params?: Record<string, string>;
  body?: unknown;
  retried?: boolean;
}

export class ApiError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

class ApiClient {
  private readonly baseUrl: string;

  private readonly timeoutMs = 10_000;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>('GET', path, { params });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, { body });
  }

  async upload<T>(path: string, formData: FormData): Promise<T> {
    return this.request<T>('UPLOAD', path, { body: formData });
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalizedPath}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  private buildHeaders(method: RequestMethod): Headers {
    const headers = new Headers();
    if (method !== 'GET') {
      const csrf = getCsrfToken();
      if (csrf) {
        headers.set('X-CSRF-Token', csrf);
      }
    }
    if (method !== 'UPLOAD') {
      headers.set('Content-Type', 'application/json');
    }
    return headers;
  }

  private async request<T>(method: RequestMethod, path: string, options: RequestOptions): Promise<T> {
    if (isMockApiEnabled()) {
      try {
        return await mockRequest<T>({
          method,
          path,
          params: options.params,
          body: options.body,
          accessToken: getAccessToken(),
        });
      } catch (error) {
        if (error instanceof MockApiError) {
          throw new ApiError(error.statusCode, error.message);
        }
        throw error;
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    const headers = this.buildHeaders(method);

    try {
      const response = await fetch(this.buildUrl(path, options.params), {
        method: method === 'GET' ? 'GET' : 'POST',
        headers,
        credentials: 'include',
        body:
          method === 'GET'
            ? undefined
            : method === 'UPLOAD'
              ? (options.body as FormData)
              : JSON.stringify(options.body ?? {}),
        signal: controller.signal,
      });

      if (response.status === 401 && !options.retried && path !== '/auth/refresh') {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          return this.request<T>(method, path, { ...options, retried: true });
        }
      }

      if (!response.ok) {
        const payload = (await this.readJson(response)) as { message?: string };
        throw new ApiError(response.status, payload?.message ?? 'Unexpected API error');
      }

      if (response.status === 204) {
        return {} as T;
      }

      return (await this.readJson(response)) as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError(408, 'Request timeout');
      }
      throw new ApiError(500, 'Unable to reach API');
    } finally {
      clearTimeout(timeout);
    }
  }

  private async readJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  private async tryRefreshToken(): Promise<boolean> {
    try {
      const headers = this.buildHeaders('POST');
      const response = await fetch(this.buildUrl('/auth/refresh'), {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({}),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const apiClient = new ApiClient();
