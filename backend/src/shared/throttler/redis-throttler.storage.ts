import { Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

type ThrottlerIncrementResult = {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
};

export class RedisThrottlerStorage implements OnModuleDestroy {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private readonly client: Redis;

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): Promise<ThrottlerIncrementResult> {
    const hitKey = `throttler:hit:${key}`;
    const blockKey = `throttler:block:${key}`;

    const blockTtl = await this.client.pttl(blockKey);
    if (blockTtl > 0) {
      const totalHits = Number((await this.client.get(hitKey)) ?? limit + 1);
      return {
        totalHits,
        timeToExpire: Math.max(await this.client.pttl(hitKey), 0),
        isBlocked: true,
        timeToBlockExpire: blockTtl,
      };
    }

    const totalHits = await this.client.incr(hitKey);
    if (totalHits === 1) {
      await this.client.pexpire(hitKey, ttl);
    }

    let timeToExpire = await this.client.pttl(hitKey);
    if (timeToExpire < 0) {
      timeToExpire = ttl;
    }

    if (totalHits > limit) {
      if (blockDuration > 0) {
        await this.client.psetex(blockKey, blockDuration, '1');
      }
      return {
        totalHits,
        timeToExpire,
        isBlocked: true,
        timeToBlockExpire: Math.max(blockDuration, 0),
      };
    }

    return {
      totalHits,
      timeToExpire,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  async addRecord(key: string, ttl: number): Promise<void> {
    await this.increment(key, ttl, Number.MAX_SAFE_INTEGER, 0);
  }

  async getRecord(key: string): Promise<number[]> {
    const ttl = await this.client.pttl(`throttler:hit:${key}`);
    if (ttl <= 0) {
      return [];
    }
    return [Date.now() - ttl];
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch (error: unknown) {
      this.logger.warn(
        JSON.stringify({
          message: 'Failed to close throttler Redis client gracefully',
          error: error instanceof Error ? error.message : 'unknown',
        }),
      );
    }
  }
}
