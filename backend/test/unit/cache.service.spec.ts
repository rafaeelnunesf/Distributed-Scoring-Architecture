import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheService } from '../../src/shared/cache/cache.service';

const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  scan: jest.fn(),
  ping: jest.fn(),
  quit: jest.fn(),
};

jest.mock('ioredis', () =>
  jest.fn().mockImplementation(() => mockRedisClient),
);

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    const configService = {
      getOrThrow: jest.fn(() => 'redis://localhost:6379'),
    } as unknown as ConfigService;

    service = new CacheService(configService);
  });

  it('set stores JSON value with TTL', async () => {
    await service.set('key', { hello: 'world' }, 60);
    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'key',
      JSON.stringify({ hello: 'world' }),
      'EX',
      60,
    );
  });

  it('get returns parsed JSON object', async () => {
    mockRedisClient.get.mockResolvedValueOnce('{"x":1}');
    const value = await service.get<{ x: number }>('key');
    expect(value).toEqual({ x: 1 });
  });

  it('del removes key', async () => {
    await service.del('key');
    expect(mockRedisClient.del).toHaveBeenCalledWith('key');
  });

  it('delPattern scans and deletes matching keys', async () => {
    mockRedisClient.scan
      .mockResolvedValueOnce(['1', ['carriers:list:a', 'carriers:list:b']])
      .mockResolvedValueOnce(['0', []]);

    await service.delPattern('carriers:list:*');

    expect(mockRedisClient.scan).toHaveBeenCalled();
    expect(mockRedisClient.del).toHaveBeenCalledWith([
      'carriers:list:a',
      'carriers:list:b',
    ]);
  });

  it('creates redis client from config URL', () => {
    expect(Redis).toHaveBeenCalled();
  });
});
