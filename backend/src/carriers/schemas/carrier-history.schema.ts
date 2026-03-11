import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Carrier } from './carrier.schema';
import { CarrierTier } from '../types/carrier.types';

@Schema({ _id: false })
class CarrierHistoryBreakdownSchemaClass {
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

@Schema({ collection: 'carrier_history' })
export class CarrierHistory {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Carrier.name,
    required: true,
    index: true,
  })
  carrier_id!: Types.ObjectId;

  @Prop({ required: true, index: true })
  dot_number!: string;

  @Prop({ required: true })
  total_score!: number;

  @Prop({ required: true })
  tier!: CarrierTier;

  @Prop({
    type: SchemaFactory.createForClass(CarrierHistoryBreakdownSchemaClass),
    required: true,
  })
  breakdown!: CarrierHistoryBreakdownSchemaClass;

  @Prop({ required: true })
  content_hash!: string;

  @Prop({ required: true, index: true, default: () => new Date() })
  recordedAt!: Date;
}

export type CarrierHistoryDocument = HydratedDocument<CarrierHistory>;
export const CarrierHistorySchema = SchemaFactory.createForClass(CarrierHistory);
