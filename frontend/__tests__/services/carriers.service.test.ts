import { carriersService } from '@/services/carriers.service';
import { apiClient } from '@/services/api-client';

vi.mock('@/services/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('carriers.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chama list com filtros corretos', async () => {
    const mockedGet = vi.mocked(apiClient.get);
    mockedGet.mockResolvedValueOnce({
      data: [],
      nextCursor: null,
      hasMore: false,
      total: 0,
    });

    await carriersService.list({
      search: 'atlas',
      min_score: 10,
      max_score: 80,
      authority_status: 'ACTIVE',
      limit: 15,
      cursor: '20',
    });

    expect(mockedGet).toHaveBeenCalledWith('/carriers', {
      search: 'atlas',
      min_score: '10',
      max_score: '80',
      authority_status: 'ACTIVE',
      limit: '15',
      cursor: '20',
    });
  });

  it('chama getById com endpoint correto', async () => {
    const mockedGet = vi.mocked(apiClient.get);
    mockedGet.mockResolvedValueOnce({ _id: 'c1' });

    await carriersService.getById('c1');

    expect(mockedGet).toHaveBeenCalledWith('/carriers/c1');
  });

  it('chama getHistory com endpoint correto', async () => {
    const mockedGet = vi.mocked(apiClient.get);
    mockedGet.mockResolvedValueOnce([]);

    await carriersService.getHistory('c2');

    expect(mockedGet).toHaveBeenCalledWith('/carriers/c2/history');
  });
});
