import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import axios from 'axios';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Connection } from 'mongoose';
import {
  CircuitBreakerService,
  type CircuitBreakerState,
} from '../shared/circuit-breaker/circuit-breaker.service';
import { CacheService } from '../shared/cache/cache.service';

type ServiceHealthStatus = {
  status: 'up' | 'down';
  latency_ms: number;
};

type HealthResponse = {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptime_seconds: number;
  version: string;
  services: {
    mongodb: ServiceHealthStatus;
    redis: ServiceHealthStatus;
    scoring_service: ServiceHealthStatus;
  };
  circuit_breaker: CircuitBreakerState;
};

@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();
  private readonly version: string;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.version =
      this.configService.get<string>('APP_VERSION') ??
      this.readVersionFromPackage();
  }

  private readVersionFromPackage(): string {
    try {
      const path = join(__dirname, '../../package.json');
      const pkg = JSON.parse(
        readFileSync(path, { encoding: 'utf-8' }),
      ) as { version?: string };
      return pkg.version ?? '0.0.0';
    } catch {
      return '0.0.0';
    }
  }

  async getHealth(): Promise<HealthResponse> {
    const [mongodb, redis, scoring_service] = await Promise.all([
      this.checkMongo(),
      this.checkRedis(),
      this.checkScoringService(),
    ]);

    const allUp =
      mongodb.status === 'up' &&
      redis.status === 'up' &&
      scoring_service.status === 'up';

    const uptime_seconds =
      Math.round((Date.now() - this.startedAt) / 1000 * 100) / 100;

    return {
      status: allUp ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime_seconds,
      version: this.version,
      services: {
        mongodb,
        redis,
        scoring_service,
      },
      circuit_breaker: this.circuitBreaker.getState(),
    };
  }

  private async checkMongo(): Promise<ServiceHealthStatus> {
    const started = Date.now();
    try {
      if (!this.connection.db) {
        throw new Error('Mongo connection is not initialized');
      }
      await this.connection.db.admin().ping();
      return {
        status: 'up',
        latency_ms: Date.now() - started,
      };
    } catch {
      return {
        status: 'down',
        latency_ms: Date.now() - started,
      };
    }
  }

  private async checkRedis(): Promise<ServiceHealthStatus> {
    const started = Date.now();
    try {
      await this.cacheService.ping();
      return {
        status: 'up',
        latency_ms: Date.now() - started,
      };
    } catch {
      return {
        status: 'down',
        latency_ms: Date.now() - started,
      };
    }
  }

  private async checkScoringService(): Promise<ServiceHealthStatus> {
    const started = Date.now();
    try {
      await axios.get(
        `${this.configService.getOrThrow<string>('SCORING_SERVICE_URL')}/health`,
        { timeout: 10_000 },
      );
      return {
        status: 'up',
        latency_ms: Date.now() - started,
      };
    } catch {
      return {
        status: 'down',
        latency_ms: Date.now() - started,
      };
    }
  }

  async getScoringWeights(): Promise<{
    weights: Record<string, number>;
    tiers: Record<string, number | string>;
  }> {
    const baseUrl = this.configService.getOrThrow<string>('SCORING_SERVICE_URL');
    const response = await axios.get<{
      weights: Record<string, number>;
      tiers: Record<string, number | string>;
    }>(`${baseUrl}/score/weights`, { timeout: 5_000 });
    return response.data;
  }
}
