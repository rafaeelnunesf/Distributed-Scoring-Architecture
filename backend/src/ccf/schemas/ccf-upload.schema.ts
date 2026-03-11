import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../auth/schemas/user.schema';

@Schema({ _id: false })
class CcfUploadErrorDetail {
  @Prop({ required: true })
  dot_number!: string;

  @Prop({ required: true })
  reason!: string;
}

@Schema({
  collection: 'ccf_uploads',
  timestamps: { createdAt: true, updatedAt: false },
})
export class CcfUpload {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ enum: ['processing', 'completed', 'failed'], required: true })
  status!: 'processing' | 'completed' | 'failed';

  @Prop({ required: true })
  filename!: string;

  @Prop({ required: true })
  total_records!: number;

  @Prop({ required: true, default: 0 })
  processed_records!: number;

  @Prop({ required: true, default: 0 })
  error_count!: number;

  @Prop({
    type: [SchemaFactory.createForClass(CcfUploadErrorDetail)],
    default: [],
  })
  error_details!: CcfUploadErrorDetail[];

  @Prop({ required: true, index: true })
  jobId!: string;

  createdAt!: Date;

  @Prop()
  completedAt?: Date;
}

export type CcfUploadDocument = HydratedDocument<CcfUpload>;
export const CcfUploadSchema = SchemaFactory.createForClass(CcfUpload);
