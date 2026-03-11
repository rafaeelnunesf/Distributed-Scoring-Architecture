import { Injectable, Logger, MessageEvent, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Observable } from 'rxjs';
import { JobStatusEvent } from '../types/ccf.types';

@Injectable()
export class JobStatusService implements OnModuleDestroy {
  private readonly logger = new Logger(JobStatusService.name);
  private readonly publisher: Redis;

  constructor(private readonly configService: ConfigService) {
    this.publisher = new Redis(configService.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
  }

  async publish(jobId: string, payload: JobStatusEvent): Promise<void> {
    const channel = this.channel(jobId);
    await this.publisher.publish(channel, JSON.stringify(payload));
  }

  stream(jobId: string): Observable<MessageEvent> {
    const redisUrl = this.configService.getOrThrow<string>('REDIS_URL');
    const channel = this.channel(jobId);

    return new Observable<MessageEvent>((subscriber) => {
      const subClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
      });

      const onMessage = (incomingChannel: string, message: string): void => {
        if (incomingChannel !== channel) {
          return;
        }

        let parsed: JobStatusEvent;
        try {
          parsed = JSON.parse(message) as JobStatusEvent;
        } catch (error: unknown) {
          this.logger.warn(
            JSON.stringify({
              message: 'Unable to parse job status event',
              jobId,
              error: error instanceof Error ? error.message : 'unknown',
            }),
          );
          return;
        }

        subscriber.next({ data: parsed });
        if (parsed.status === 'completed' || parsed.status === 'failed') {
          subscriber.complete();
        }
      };

      subClient.on('message', onMessage);
      void subClient.subscribe(channel).catch((error: unknown) => {
        subscriber.error(error);
      });

      return () => {
        subClient.removeListener('message', onMessage);
        void subClient.unsubscribe(channel).finally(() => {
          void subClient.quit();
        });
      };
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.publisher.quit();
  }

  private channel(jobId: string): string {
    return `job:status:${jobId}`;
  }
}
