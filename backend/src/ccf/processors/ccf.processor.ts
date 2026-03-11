import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Job } from 'bullmq';
import { Model } from 'mongoose';
import { CarriersRepository } from '../../carriers/repositories/carriers.repository';
import { CarriersService } from '../../carriers/carriers.service';
import {
  CarrierHistoryEntryInput,
  CarrierUpsertInput,
} from '../../carriers/types/carrier.types';
import { CircuitBreakerService } from '../../shared/circuit-breaker/circuit-breaker.service';
import { CCF_QUEUE_NAME } from '../constants/queue.constants';
import { CcfUpload, CcfUploadDocument } from '../schemas/ccf-upload.schema';
import {
  CcfRecord,
  ScoreBatchResponse,
  ScoreBatchResult,
} from '../types/ccf.types';
import { JobStatusService } from '../services/job-status.service';

type ProcessCcfJobData = {
  uploadId: string;
  records: CcfRecord[];
  correlationId?: string;
};

@Injectable()
@Processor(CCF_QUEUE_NAME)
export class CcfProcessor extends WorkerHost {
  private readonly logger = new Logger(CcfProcessor.name);
  private readonly scoringServiceUrl: string;

  constructor(
    @InjectModel(CcfUpload.name)
    private readonly ccfUploadModel: Model<CcfUploadDocument>,
    private readonly carriersRepository: CarriersRepository,
    private readonly carriersService: CarriersService,
    private readonly jobStatusService: JobStatusService,
    private readonly configService: ConfigService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {
    super();
    this.scoringServiceUrl =
      this.configService.getOrThrow<string>('SCORING_SERVICE_URL');
  }

  async process(job: Job<ProcessCcfJobData>): Promise<void> {
    const { uploadId, records, correlationId } = job.data;
    const jobId = String(job.id);
    const jobStartTime = Date.now();
    const total_records = records.length;
    let processed_records = 0;
    let error_count = 0;
    const error_details: Array<{ dot_number: string; reason: string }> = [];
    const scoringLatenciesMs: number[] = [];
    const persistLatenciesMs: number[] = [];

    try {
      const chunks = this.chunk(records, 50);
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunkRecords = chunks[chunkIndex];
        const chunkStart = Date.now();
        let scoringLatencyMs = 0;
        let persistLatencyMs = 0;
        let changedRecords = 0;
        let unchangedRecords = 0;

        try {
          const previousHashes =
            await this.getPreviousHashesForChunk(chunkRecords);
          const scoreStart = Date.now();
          const results = await this.circuitBreaker.execute(() =>
            this.scoreChunkWithRetry(chunkRecords, previousHashes),
          );
          scoringLatencyMs = Date.now() - scoreStart;
          scoringLatenciesMs.push(scoringLatencyMs);

          changedRecords = results.filter((r) => r.changed).length;
          unchangedRecords = results.length - changedRecords;

          const persistStart = Date.now();
          await this.persistChunk(results);
          persistLatencyMs = Date.now() - persistStart;
          persistLatenciesMs.push(persistLatencyMs);
        } catch (error: unknown) {
          const reason = this.getErrorMessage(error);
          error_count += chunkRecords.length;
          for (const record of chunkRecords) {
            error_details.push({
              dot_number: this.dotNumberFromRecord(record),
              reason,
            });
          }
          this.logger.warn(
            JSON.stringify({
              message: 'Partial chunk failed during processing',
              jobId,
              reason,
              chunkSize: chunkRecords.length,
            }),
          );
        } finally {
          const totalChunkMs = Date.now() - chunkStart;
          this.logger.log(
            JSON.stringify({
              correlationId: correlationId ?? undefined,
              jobId,
              chunkIndex,
              chunkSize: chunkRecords.length,
              scoringLatencyMs,
              persistLatencyMs,
              totalChunkMs,
              changedRecords,
              unchangedRecords,
            }),
          );
          processed_records += chunkRecords.length;
          const progress =
            total_records > 0
              ? Math.round((processed_records / total_records) * 100)
              : 100;
          await this.jobStatusService.publish(jobId, {
            jobId,
            status: 'processing',
            progress,
          });
        }
      }

      const finalStatus: 'completed' | 'failed' =
        error_count >= total_records ? 'failed' : 'completed';
      const totalDurationMs = Date.now() - jobStartTime;

      this.logger.log(
        JSON.stringify({
          message: 'CCF job completed',
          jobId,
          correlationId: correlationId ?? undefined,
          totalDurationMs,
          chunksProcessed: chunks.length,
        }),
      );

      await this.ccfUploadModel
        .updateOne(
          { _id: uploadId },
          {
            $set: {
              status: finalStatus,
              total_records,
              processed_records,
              error_count,
              error_details,
              completedAt: new Date(),
            },
          },
        )
        .exec();

      await this.carriersService.invalidateCache();

      const chunksProcessed = chunks.length;
      const successfulChunks = scoringLatenciesMs.length;
      const scoringLatencyAvgMs =
        successfulChunks > 0
          ? scoringLatenciesMs.reduce((a, b) => a + b, 0) / successfulChunks
          : 0;
      const persistLatencyAvgMs =
        successfulChunks > 0
          ? persistLatenciesMs.reduce((a, b) => a + b, 0) / successfulChunks
          : 0;

      await this.jobStatusService.publish(jobId, {
        jobId,
        status: finalStatus,
        summary: {
          total_records,
          processed_records,
          error_count,
        },
        metrics: {
          total_duration_ms: totalDurationMs,
          chunks_processed: chunksProcessed,
          scoring_latency_avg_ms: Math.round(scoringLatencyAvgMs * 100) / 100,
          persist_latency_avg_ms: Math.round(persistLatencyAvgMs * 100) / 100,
        },
      });
    } catch (error: unknown) {
      const reason = this.getErrorMessage(error);
      const totalDurationMs = Date.now() - jobStartTime;

      await this.ccfUploadModel
        .updateOne(
          { _id: uploadId },
          {
            $set: {
              status: 'failed',
              total_records,
              processed_records,
              error_count: total_records,
              error_details: [
                {
                  dot_number: 'ALL',
                  reason,
                },
              ],
              completedAt: new Date(),
            },
          },
        )
        .exec();

      await this.jobStatusService.publish(jobId, {
        jobId,
        status: 'failed',
        error: reason,
        summary: {
          total_records,
          processed_records,
          error_count: total_records,
        },
        metrics: {
          total_duration_ms: totalDurationMs,
          chunks_processed: 0,
          scoring_latency_avg_ms: 0,
          persist_latency_avg_ms: 0,
        },
      });

      this.logger.error(
        JSON.stringify({
          message: 'CCF processor failed unexpectedly',
          jobId,
          correlationId: correlationId ?? undefined,
          reason,
          totalDurationMs,
        }),
      );
    }
  }

  private async scoreChunkWithRetry(
    records: CcfRecord[],
    previousHashes: Record<string, string>,
    maxRetries = 3,
  ): Promise<ScoreBatchResult[]> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.scoreChunk(records, previousHashes);
      } catch (error: unknown) {
        if (!this.isRetryable(error) || attempt === maxRetries) {
          throw error;
        }
        const delayMs =
          Math.min(1000 * 2 ** (attempt - 1), 8000) + Math.random() * 500;
        await this.sleep(delayMs);
      }
    }
    throw new Error('unreachable');
  }

  private isRetryable(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status != null && status >= 400 && status < 500) {
        return false;
      }
      return true;
    }
    if (error instanceof Error && error.message === 'Circuit breaker is OPEN') {
      return false;
    }
    return true;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async scoreChunk(
    records: CcfRecord[],
    previousHashes: Record<string, string>,
  ): Promise<ScoreBatchResult[]> {
    try {
      const response = await axios.post<ScoreBatchResponse>(
        `${this.scoringServiceUrl}/score/batch`,
        { records, previous_hashes: previousHashes },
        { timeout: 10_000 },
      );
      if (!response.data || !Array.isArray(response.data.results)) {
        throw new Error('Invalid score batch response');
      }
      return response.data.results;
    } catch (error: unknown) {
      throw new Error(`Scoring request failed: ${this.getErrorMessage(error)}`);
    }
  }

  private async persistChunk(results: ScoreBatchResult[]): Promise<void> {
    if (results.length === 0) {
      return;
    }

    const now = new Date();
    const upserts: CarrierUpsertInput[] = results.map((result) => ({
      dot_number: result.dot_number,
      legal_name: result.legal_name,
      total_score: result.total_score,
      tier: result.tier,
      breakdown: result.breakdown,
      content_hash: result.content_hash,
      authority_status: result.authority_status,
      raw_data: result.raw_data,
      lastUpdatedAt: now,
      explanations: result.explanations,
    }));
    await this.carriersRepository.upsertMany(upserts);

    const changed = results.filter((result) => result.changed);
    if (changed.length === 0) {
      return;
    }

    const carriers = await this.carriersRepository.findByDotNumbers(
      changed.map((result) => result.dot_number),
    );
    const carrierByDot = new Map(
      carriers.map((carrier) => [carrier.dot_number, carrier]),
    );

    const historyEntries: CarrierHistoryEntryInput[] = [];
    for (const result of changed) {
      const carrier = carrierByDot.get(result.dot_number);
      if (!carrier) {
        continue;
      }
      historyEntries.push({
        carrier_id: carrier._id.toString(),
        dot_number: result.dot_number,
        total_score: result.total_score,
        tier: result.tier,
        breakdown: result.breakdown,
        content_hash: result.content_hash,
        recordedAt: now,
      });
    }

    await this.carriersRepository.createHistoryEntries(historyEntries);
  }

  private chunk<T>(input: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < input.length; index += chunkSize) {
      chunks.push(input.slice(index, index + chunkSize));
    }
    return chunks;
  }

  private async getPreviousHashesForChunk(
    records: CcfRecord[],
  ): Promise<Record<string, string>> {
    const dotNumbers = Array.from(
      new Set(
        records
          .map((record) => this.dotNumberFromRecord(record))
          .filter((dot) => dot !== 'unknown'),
      ),
    );
    if (dotNumbers.length === 0) {
      return {};
    }

    const existingCarriers =
      await this.carriersRepository.findByDotNumbers(dotNumbers);
    const previousHashes: Record<string, string> = {};
    for (const carrier of existingCarriers) {
      if (carrier.dot_number && carrier.content_hash) {
        previousHashes[carrier.dot_number] = carrier.content_hash;
      }
    }
    return previousHashes;
  }

  private dotNumberFromRecord(record: Record<string, unknown>): string {
    const value = record.dot_number;
    return typeof value === 'string' && value.trim() !== '' ? value : 'unknown';
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error';
  }
}
