import { BullModule } from '@nestjs/bullmq';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import Joi from 'joi';
import { AuthModule } from './auth/auth.module';
import { CsrfGuard } from './auth/csrf.guard';
import { CarriersModule } from './carriers/carriers.module';
import { CcfModule } from './ccf/ccf.module';
import { HealthModule } from './health/health.module';
import { CorrelationIdMiddleware } from './shared/middleware/correlation-id.middleware';
import { SharedModule } from './shared/shared.module';
import { RedisThrottlerStorage } from './shared/throttler/redis-throttler.storage';

function parseRedisUrl(redisUrl: string): {
  host: string;
  port: number;
  username?: string;
  password?: string;
} {
  const parsed = new URL(redisUrl);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        MONGODB_URI: Joi.string().uri().required(),
        REDIS_URL: Joi.string().uri().required(),
        SCORING_SERVICE_URL: Joi.string().uri().required(),
        JWT_SECRET: Joi.string().min(8).required(),
        JWT_REFRESH_SECRET: Joi.string().min(8).required(),
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: parseRedisUrl(configService.getOrThrow<string>('REDIS_URL')),
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            limit: 60,
            ttl: 60_000,
          },
        ],
        storage: new RedisThrottlerStorage(
          configService.getOrThrow<string>('REDIS_URL'),
        ),
      }),
    }),
    SharedModule,
    AuthModule,
    CarriersModule,
    CcfModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    CorrelationIdMiddleware,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
