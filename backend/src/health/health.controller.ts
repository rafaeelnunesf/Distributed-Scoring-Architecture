import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) { }

  @Get()
  @ApiOperation({ summary: 'Get API and dependency health status' })
  @ApiResponse({ status: 200, description: 'Health status retrieved' })
  async getHealth(): Promise<{
    status: 'ok' | 'degraded';
    timestamp: string;
    uptime_seconds: number;
    version: string;
    services: {
      mongodb: { status: 'up' | 'down'; latency_ms: number };
      redis: { status: 'up' | 'down'; latency_ms: number };
      scoring_service: { status: 'up' | 'down'; latency_ms: number };
    };
    circuit_breaker: {
      state: string;
      failures: number;
      last_failure: string | null;
      last_state_change: string;
    };
  }> {
    return this.healthService.getHealth();
  }

  @Get('score-weights')
  @ApiOperation({ summary: 'Get scoring factor weights from scoring service' })
  @ApiResponse({ status: 200, description: 'Weights and tier thresholds' })
  async getScoreWeights(): Promise<{
    weights: Record<string, number>;
    tiers: Record<string, number | string>;
  }> {
    return this.healthService.getScoringWeights();
  }
}
