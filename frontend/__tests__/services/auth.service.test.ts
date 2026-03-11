import { getAccessToken, setTokens } from '@/lib/token-store';
import { authService } from '@/services/auth.service';
import { apiClient } from '@/services/api-client';

vi.mock('@/services/api-client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('realiza login e salva tokens localmente', async () => {
    const mockedPost = vi.mocked(apiClient.post);
    mockedPost.mockResolvedValueOnce({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });

    await authService.login('rafael@example.com', '123456');

    expect(mockedPost).toHaveBeenCalledWith('/auth/login', {
      email: 'rafael@example.com',
      password: '123456',
    });
    expect(getAccessToken()).toBe('access-token');
  });

  it('logout limpa tokens locais', async () => {
    setTokens({ access_token: 'token', refresh_token: 'refresh' });
    vi.mocked(apiClient.post).mockResolvedValueOnce(undefined);

    await authService.logout();

    expect(getAccessToken()).toBeNull();
  });

  it('refresh chama endpoint correto', async () => {
    const mockedPost = vi.mocked(apiClient.post);
    mockedPost.mockResolvedValueOnce({ access_token: 'new-access' });

    await authService.refresh('refresh-token');

    expect(mockedPost).toHaveBeenCalledWith('/auth/refresh', {
      refresh_token: 'refresh-token',
    });
  });
});
