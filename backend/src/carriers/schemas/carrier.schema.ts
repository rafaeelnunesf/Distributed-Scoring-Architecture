import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { CarrierTier } from '../types/carrier.types';

@Schema({ _id: false })
export class CarrierBreakdownSchemaClass {
  @Prop({ required: true })
  safety_rating!: number;

  @Prop({ required: true })
  oos_pct!: number;

  @Prop({ required: true })
  crash_total!: number;

  @Prop({ required: true })
  driver_oos!: number;

  @Prop({ required: true })
  insurance!: number;

  @Prop({ required: true })
  authority!: number;
}

@Schema({
  collection: 'carriers',
  timestamps: { createdAt: true, updatedAt: false },
})
export class Carrier {
  @Prop({ required: true, unique: true, index: true })
  dot_number!: string;

  @Prop({ required: true })
  legal_name!: string;

  @Prop({ required: true, index: true })
  total_score!: number;

  @Prop({ required: true, enum: ['SAFE', 'CAUTION', 'RISK'] })
  tier!: CarrierTier;

  @Prop({
    type: SchemaFactory.createForClass(CarrierBreakdownSchemaClass),
    required: true,
  })
  breakdown!: CarrierBreakdownSchemaClass;

  @Prop({ required: true })
  content_hash!: string;

  @Prop({ required: true, index: true })
  authority_status!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  raw_data!: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.Mixed, required: false })
  explanations?: Array<{
    factor: string;
    points: number;
    max_points: number;
    weight_pct: number;
    input_value: string | number | null;
    description: string;
  }>;

  @Prop({ required: true, default: () => new Date() })
  lastUpdatedAt!: Date;

  createdAt!: Date;
}

export type CarrierDocument = HydratedDocument<Carrier>;
export const CarrierSchema = SchemaFactory.createForClass(Carrier);
CarrierSchema.index({ legal_name: 'text' });
