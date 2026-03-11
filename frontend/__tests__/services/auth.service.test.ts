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
    window.localStorage.clear();
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
    expect(window.localStorage.getItem('carrier_assure_access_token')).toBe('access-token');
    expect(window.localStorage.getItem('carrier_assure_refresh_token')).toBe('refresh-token');
  });

  it('logout limpa tokens locais', () => {
    window.localStorage.setItem('carrier_assure_access_token', 'token');
    window.localStorage.setItem('carrier_assure_refresh_token', 'refresh');

    authService.logout();

    expect(window.localStorage.getItem('carrier_assure_access_token')).toBeNull();
    expect(window.localStorage.getItem('carrier_assure_refresh_token')).toBeNull();
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
