import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bullmq';
import { Model, Types } from 'mongoose';
import { CCF_JOB_NAME, CCF_QUEUE_NAME } from '../constants/queue.constants';
import { CcfUpload, CcfUploadDocument } from '../schemas/ccf-upload.schema';
import { CcfRecord } from '../types/ccf.types';
import { JobStatusService } from './job-status.service';

type ProcessCcfJobData = {
  uploadId: string;
  records: CcfRecord[];
  correlationId?: string;
};

@Injectable()
export class CcfService {
  constructor(
    @InjectQueue(CCF_QUEUE_NAME) private readonly queue: Queue<ProcessCcfJobData>,
    @InjectModel(CcfUpload.name)
    private readonly ccfUploadModel: Model<CcfUploadDocument>,
    private readonly jobStatusService: JobStatusService,
  ) { }

  async createUploadAndEnqueue(
    userId: string,
    filename: string,
    records: CcfRecord[],
    correlationId?: string,
  ): Promise<{ jobId: string; status: 'processing'; total_records: number }> {
    const upload = await this.ccfUploadModel.create({
      userId: new Types.ObjectId(userId),
      status: 'processing',
      filename,
      total_records: records.length,
      processed_records: 0,
      error_count: 0,
      error_details: [],
      jobId: `pending-${new Types.ObjectId().toString()}`,
    });

    const job = await this.queue.add(
      CCF_JOB_NAME,
      { uploadId: upload.id, records, correlationId },
      {
        removeOnComplete: 1000,
        removeOnFail: 1000,
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
    const jobId = String(job.id);

    await this.ccfUploadModel
      .updateOne({ _id: upload._id }, { $set: { jobId } })
      .exec();

    return {
      jobId,
      status: 'processing',
      total_records: records.length,
    };
  }

  async statusStreamForUser(
    userId: string,
    jobId: string,
  ): Promise<ReturnType<JobStatusService['stream']>> {
    await this.assertUploadBelongsToUser(userId, jobId);
    return this.jobStatusService.stream(jobId);
  }

  async listUploads(
    userId: string,
    skip: number,
    limit: number,
  ): Promise<CcfUpload[]> {
    const uploads = await this.ccfUploadModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
    return uploads as unknown as CcfUpload[];
  }

  private async assertUploadBelongsToUser(
    userId: string,
    jobId: string,
  ): Promise<void> {
    const upload = await this.ccfUploadModel
      .findOne({
        userId: new Types.ObjectId(userId),
        jobId,
      })
      .lean()
      .exec();

    if (!upload) {
      throw new NotFoundException('Upload not found for this user');
    }
  }
}
