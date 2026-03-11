import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache/cache.service';
import { CircuitBreakerService } from './circuit-breaker/circuit-breaker.service';

@Global()
@Module({
  providers: [CacheService, CircuitBreakerService],
  exports: [CacheService, CircuitBreakerService],
})
export class SharedModule {}
