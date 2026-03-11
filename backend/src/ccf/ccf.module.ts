import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CarriersModule } from '../carriers/carriers.module';
import { CCF_QUEUE_NAME } from './constants/queue.constants';
import { CcfController } from './controllers/ccf.controller';
import { CcfProcessor } from './processors/ccf.processor';
import { CcfUpload, CcfUploadSchema } from './schemas/ccf-upload.schema';
import { CcfService } from './services/ccf.service';
import { JobStatusService } from './services/job-status.service';

@Module({
  imports: [
    CarriersModule,
    BullModule.registerQueue({
      name: CCF_QUEUE_NAME,
    }),
    MongooseModule.forFeature([
      { name: CcfUpload.name, schema: CcfUploadSchema },
    ]),
  ],
  controllers: [CcfController],
  providers: [CcfService, JobStatusService, CcfProcessor],
  exports: [CcfService],
})
export class CcfModule { }
