import { ExecutionContext, INestApplication, MessageEvent } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import axios from 'axios';
import { Job } from 'bullmq';
import { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Observable, ReplaySubject, lastValueFrom } from 'rxjs';
import request from 'supertest';
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard';
import { CarriersRepository } from '../../src/carriers/repositories/carriers.repository';
import { Carrier } from '../../src/carriers/schemas/carrier.schema';
import {
  CarrierHistory,
  CarrierHistorySchema,
} from '../../src/carriers/schemas/carrier-history.schema';
import { CarrierSchema } from '../../src/carriers/schemas/carrier.schema';
import { CarriersService } from '../../src/carriers/carriers.service';
import { CCF_QUEUE_NAME } from '../../src/ccf/constants/queue.constants';
import { CcfController } from '../../src/ccf/controllers/ccf.controller';
import { CcfProcessor } from '../../src/ccf/processors/ccf.processor';
import { CcfUpload, CcfUploadSchema } from '../../src/ccf/schemas/ccf-upload.schema';
import { CcfService } from '../../src/ccf/services/ccf.service';
import { JobStatusService } from '../../src/ccf/services/job-status.service';
import { CcfRecord, JobStatusEvent } from '../../src/ccf/types/ccf.types';
import { CircuitBreakerService } from '../../src/shared/circuit-breaker/circuit-breaker.service';
import { CacheService } from '../../src/shared/cache/cache.service';

jest.mock('axios');

class InMemoryJobStatusService {
  private readonly channels = new Map<string, ReplaySubject<MessageEvent>>();

  async publish(jobId: string, payload: JobStatusEvent): Promise<void> {
    const channel = this.getChannel(jobId);
    channel.next({ data: payload });
    if (payload.status === 'completed' || payload.status === 'failed') {
      channel.complete();
    }
  }

  stream(jobId: string): Observable<MessageEvent> {
    return this.getChannel(jobId).asObservable();
  }

  private getChannel(jobId: string): ReplaySubject<MessageEvent> {
    const existing = this.channels.get(jobId);
    if (existing) {
      return existing;
    }
    const created = new ReplaySubject<MessageEvent>(20);
    this.channels.set(jobId, created);
    return created;
  }
}

describe('CCF upload integration', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const testUserId = '507f1f77bcf86cd799439011';

  let mongod: MongoMemoryServer;
  let app: INestApplication;
  let moduleRef: TestingModule;
  let ccfService: CcfService;
  let processor: CcfProcessor;
  let uploadModel: Model<CcfUpload>;
  let carrierModel: Model<Carrier>;

  const queueMock = {
    add: jest.fn(async () => ({ id: 'job-integration-1' })),
  };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
  });

  afterAll(async () => {
    await mongod.stop();
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    mockedAxios.post.mockImplementation(async (_, body: unknown) => {
      const payload = body as { records: CcfRecord[] };
      return {
        data: {
          results: payload.records.map((record) => ({
            dot_number: record.dot_number,
            legal_name: `Carrier ${record.dot_number}`,
            total_score: 77,
            tier: 'CAUTION' as const,
            breakdown: {
              safety_rating: 70,
              oos_pct: 75,
              crash_total: 80,
              driver_oos: 72,
              insurance: 78,
              authority: 79,
            },
            content_hash: `hash-${record.dot_number}`,
            authority_status: 'ACTIVE',
            raw_data: record,
            changed: true,
          })),
        },
      };
    });

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri()),
        MongooseModule.forFeature([
          { name: Carrier.name, schema: CarrierSchema },
          { name: CarrierHistory.name, schema: CarrierHistorySchema },
          { name: CcfUpload.name, schema: CcfUploadSchema },
        ]),
      ],
      controllers: [CcfController],
      providers: [
        CcfService,
        CcfProcessor,
        CarriersRepository,
        CarriersService,
        {
          provide: JobStatusService,
          useClass: InMemoryJobStatusService,
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined),
            delPattern: jest.fn().mockResolvedValue(undefined),
            ping: jest.fn().mockResolvedValue('PONG'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SCORING_SERVICE_URL') return 'http://scoring-worker:8001';
              if (key === 'REDIS_URL') return 'redis://localhost:6379';
              if (key === 'CIRCUIT_BREAKER_FAILURE_THRESHOLD') return 5;
              if (key === 'CIRCUIT_BREAKER_RESET_TIMEOUT_MS') return 30000;
              if (key === 'CIRCUIT_BREAKER_HALF_OPEN_ATTEMPTS') return 1;
              return undefined;
            }),
            getOrThrow: jest.fn((key: string) => {
              if (key === 'SCORING_SERVICE_URL') return 'http://scoring-worker:8001';
              if (key === 'REDIS_URL') return 'redis://localhost:6379';
              return 'test-value';
            }),
          },
        },
        CircuitBreakerService,
        {
          provide: getQueueToken(CCF_QUEUE_NAME),
          useValue: queueMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = { sub: testUserId, email: 'test@example.com' };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    ccfService = moduleRef.get<CcfService>(CcfService);
    processor = moduleRef.get<CcfProcessor>(CcfProcessor);
    uploadModel = moduleRef.get<Model<CcfUpload>>(getModelToken(CcfUpload.name));
    carrierModel = moduleRef.get<Model<Carrier>>(getModelToken(Carrier.name));
  });

  afterEach(async () => {
    await app.close();
  });

  it('runs upload -> processing -> Mongo persistence -> SSE stream', async () => {
    const payload: CcfRecord[] = [
      { dot_number: '123', legal_name: 'Carrier 123' },
      { dot_number: '456', legal_name: 'Carrier 456' },
    ];

    const uploadResponse = await request(app.getHttpServer())
      .post('/ccf/upload')
      .send(payload)
      .expect(202);

    expect(uploadResponse.body.status).toBe('processing');
    const jobId = uploadResponse.body.jobId as string;
    expect(jobId).toBe('job-integration-1');

    const upload = await uploadModel.findOne({ jobId }).exec();
    expect(upload).toBeTruthy();

    const job = {
      id: jobId,
      data: {
        uploadId: upload!.id,
        records: payload,
      },
    } as unknown as Job<{ uploadId: string; records: CcfRecord[] }>;

    await processor.process(job);

    const carriersInDb = await carrierModel.countDocuments().exec();
    expect(carriersInDb).toBe(2);

    const stream = await ccfService.statusStreamForUser(testUserId, jobId);
    const finalEvent = await lastValueFrom(stream);
    const status = (finalEvent.data as JobStatusEvent).status;
    expect(status).toBe('completed');
  });
});
