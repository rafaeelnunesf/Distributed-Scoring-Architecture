import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  Model,
  Types,
  isValidObjectId,
} from 'mongoose';
import {
  Carrier,
  CarrierDocument,
} from '../schemas/carrier.schema';
import {
  CarrierHistory,
  CarrierHistoryDocument,
} from '../schemas/carrier-history.schema';
import {
  CarrierFilters,
  CarrierHistoryEntryInput,
  CarrierUpsertInput,
} from '../types/carrier.types';

type CarrierLean = Carrier & { _id: Types.ObjectId };
type CarrierHistoryLean = CarrierHistory & { _id: Types.ObjectId };
type CarrierMongoFilter = Record<string, unknown>;

@Injectable()
export class CarriersRepository {
  constructor(
    @InjectModel(Carrier.name)
    private readonly carrierModel: Model<CarrierDocument>,
    @InjectModel(CarrierHistory.name)
    private readonly carrierHistoryModel: Model<CarrierHistoryDocument>,
  ) { }

  async findWithFilters(
    filters: CarrierFilters,
    cursor: string | undefined,
    limit: number,
  ): Promise<{
    data: CarrierLean[];
    nextCursor: string | null;
    hasMore: boolean;
    total: number;
  }> {
    const baseFilter = this.buildFilters(filters);
    const queryFilter: CarrierMongoFilter = { ...baseFilter };

    if (cursor && isValidObjectId(cursor)) {
      queryFilter._id = { $lt: new Types.ObjectId(cursor) };
    }

    const [total, rows] = await Promise.all([
      this.carrierModel.countDocuments(baseFilter).exec(),
      this.carrierModel
        .find(queryFilter)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .lean()
        .exec(),
    ]);

    const carriers = rows as unknown as CarrierLean[];
    const hasMore = carriers.length > limit;
    const data = hasMore ? carriers.slice(0, limit) : carriers;
    const nextCursor =
      hasMore && data.length > 0
        ? data[data.length - 1]._id.toString()
        : null;

    return {
      data,
      nextCursor,
      hasMore,
      total,
    };
  }

  async findById(id: string): Promise<CarrierLean | null> {
    if (!isValidObjectId(id)) {
      return null;
    }
    const carrier = await this.carrierModel.findById(id).lean().exec();
    return (carrier as unknown as CarrierLean | null) ?? null;
  }

  async findByDotNumbers(dotNumbers: string[]): Promise<CarrierLean[]> {
    if (dotNumbers.length === 0) {
      return [];
    }
    const carriers = await this.carrierModel
      .find({ dot_number: { $in: dotNumbers } })
      .lean()
      .exec();
    return carriers as unknown as CarrierLean[];
  }

  async upsertMany(carriers: CarrierUpsertInput[]): Promise<void> {
    if (carriers.length === 0) {
      return;
    }
    await this.carrierModel.bulkWrite(
      carriers.map((carrier) => ({
        updateOne: {
          filter: { dot_number: carrier.dot_number },
          update: {
            $set: {
              legal_name: carrier.legal_name,
              total_score: carrier.total_score,
              tier: carrier.tier,
              breakdown: carrier.breakdown,
              content_hash: carrier.content_hash,
              authority_status: carrier.authority_status,
              raw_data: carrier.raw_data,
              lastUpdatedAt: carrier.lastUpdatedAt,
            },
            $setOnInsert: {
              dot_number: carrier.dot_number,
              createdAt: new Date(),
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }

  async createHistoryEntries(entries: CarrierHistoryEntryInput[]): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    const docs = entries.map((entry) => ({
      carrier_id: new Types.ObjectId(entry.carrier_id),
      dot_number: entry.dot_number,
      total_score: entry.total_score,
      tier: entry.tier,
      breakdown: entry.breakdown,
      content_hash: entry.content_hash,
      recordedAt: entry.recordedAt,
    }));

    await this.carrierHistoryModel.insertMany(docs, { ordered: false });
  }

  async findHistoryByCarrierId(
    carrierId: string,
    limit = 50,
  ): Promise<CarrierHistoryLean[]> {
    if (!isValidObjectId(carrierId)) {
      return [];
    }
    const history = await this.carrierHistoryModel
      .find({ carrier_id: new Types.ObjectId(carrierId) })
      .sort({ recordedAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return history as unknown as CarrierHistoryLean[];
  }

  private buildFilters(
    filters: CarrierFilters,
  ): CarrierMongoFilter {
    const query: CarrierMongoFilter = {};

    const scoreRange: { $gte?: number; $lte?: number } = {};
    if (typeof filters.minScore === 'number') {
      scoreRange.$gte = filters.minScore;
    }
    if (typeof filters.maxScore === 'number') {
      scoreRange.$lte = filters.maxScore;
    }
    if (Object.keys(scoreRange).length > 0) {
      query.total_score = scoreRange;
    }

    if (filters.authorityStatus) {
      query.authority_status = filters.authorityStatus;
    }

    if (filters.search) {
      const regex = new RegExp(filters.search, 'i');
      query.$or = [{ legal_name: regex }, { dot_number: regex }];
    }

    return query;
  }
}
