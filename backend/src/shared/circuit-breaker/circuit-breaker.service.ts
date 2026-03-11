import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export type CircuitBreakerState = {
  state: CircuitState;
  failures: number;
  last_failure: string | null;
  last_state_change: string;
};

@Injectable()
export class CircuitBreakerService {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private lastFailure: string | null = null;
  private lastStateChange = new Date().toISOString();
  private halfOpenAttempts = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenMaxAttempts: number;

  constructor(private readonly configService: ConfigService) {
    this.failureThreshold =
      this.configService.get<number>('CIRCUIT_BREAKER_FAILURE_THRESHOLD') ?? 5;
    this.resetTimeoutMs =
      this.configService.get<number>('CIRCUIT_BREAKER_RESET_TIMEOUT_MS') ??
      30_000;
    this.halfOpenMaxAttempts =
      this.configService.get<number>('CIRCUIT_BREAKER_HALF_OPEN_ATTEMPTS') ?? 1;
  }

  getState(): CircuitBreakerState {
    return {
      state: this.state,
      failures: this.failures,
      last_failure: this.lastFailure,
      last_state_change: this.lastStateChange,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - new Date(this.lastStateChange).getTime() >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.halfOpenAttempts = 0;
        this.lastStateChange = new Date().toISOString();
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.failures = 0;
      this.lastFailure = null;
      this.lastStateChange = new Date().toISOString();
    } else if (this.state === 'CLOSED') {
      this.failures = 0;
    }
  }

  private onFailure(error: unknown): void {
    const message = error instanceof Error ? error.message : 'unknown error';
    this.lastFailure = message;
    this.failures += 1;

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.lastStateChange = new Date().toISOString();
      return;
    }

    if (this.state === 'CLOSED' && this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.lastStateChange = new Date().toISOString();
    }
  }
}
