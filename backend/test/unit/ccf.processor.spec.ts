import axios from 'axios';
import { Job } from 'bullmq';
import { Types } from 'mongoose';
import { CcfProcessor } from '../../src/ccf/processors/ccf.processor';
import { CcfRecord } from '../../src/ccf/types/ccf.types';

jest.mock('axios');

describe('CcfProcessor', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  const ccfUploadModelMock = {
    updateOne: jest.fn(),
  };

  const carriersRepositoryMock = {
    upsertMany: jest.fn(),
    findByDotNumbers: jest.fn(),
    createHistoryEntries: jest.fn(),
  };

  const carriersServiceMock = {
    invalidateCache: jest.fn(),
  };

  const jobStatusServiceMock = {
    publish: jest.fn(),
  };

  const configServiceMock = {
    getOrThrow: jest.fn(() => 'http://scoring-worker:8001'),
  };

  const circuitBreakerMock = {
    execute: jest.fn(<T>(fn: () => Promise<T>) => fn()),
  };

  let processor: CcfProcessor;

  beforeEach(() => {
    jest.clearAllMocks();

    ccfUploadModelMock.updateOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({}),
    });

    carriersRepositoryMock.findByDotNumbers.mockImplementation(
      async (dotNumbers: string[]) =>
        dotNumbers.map((dotNumber) => ({
          _id: new Types.ObjectId(),
          dot_number: dotNumber,
        })),
    );

    mockedAxios.post.mockImplementation(async (_, body: unknown) => {
      const payload = body as { records: CcfRecord[] };
      return {
        data: {
          results: payload.records.map((record) => ({
            dot_number: record.dot_number,
            legal_name: `Carrier ${record.dot_number}`,
            total_score: 80,
            tier: 'SAFE' as const,
            breakdown: {
              safety_rating: 80,
              oos_pct: 80,
              crash_total: 80,
              driver_oos: 80,
              insurance: 80,
              authority: 80,
            },
            content_hash: `hash-${record.dot_number}`,
            authority_status: 'ACTIVE',
            raw_data: record,
            changed: true,
          })),
        },
      };
    });

    processor = new CcfProcessor(
      ccfUploadModelMock as never,
      carriersRepositoryMock as never,
      carriersServiceMock as never,
      jobStatusServiceMock as never,
      configServiceMock as never,
      circuitBreakerMock as never,
    );
  });

  it('chunks payload by 50 and persists scored carriers', async () => {
    const records: CcfRecord[] = Array.from({ length: 120 }, (_, index) => ({
      dot_number: `${1000 + index}`,
      legal_name: `Carrier ${index}`,
    }));

    const job = {
      id: 'job-1',
      data: {
        uploadId: new Types.ObjectId().toString(),
        records,
      },
    } as unknown as Job<{ uploadId: string; records: CcfRecord[] }>;

    await processor.process(job);

    expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    expect(carriersRepositoryMock.upsertMany).toHaveBeenCalledTimes(3);
    expect(carriersRepositoryMock.createHistoryEntries).toHaveBeenCalledTimes(3);
    expect(carriersServiceMock.invalidateCache).toHaveBeenCalledTimes(1);
    expect(jobStatusServiceMock.publish).toHaveBeenCalled();
    expect(ccfUploadModelMock.updateOne).toHaveBeenCalled();
  });
});
