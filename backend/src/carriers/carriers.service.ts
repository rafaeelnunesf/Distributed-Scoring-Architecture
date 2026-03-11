import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { CacheService } from '../shared/cache/cache.service';
import { ListCarriersQueryDto } from './dto/list-carriers-query.dto';
import { CarriersRepository } from './repositories/carriers.repository';
import { CarrierFilters } from './types/carrier.types';

type ListCarriersResponse = Awaited<
  ReturnType<CarriersRepository['findWithFilters']>
>;
type CarrierByIdResponse = Awaited<ReturnType<CarriersRepository['findById']>>;
type CarrierHistoryResponse = Awaited<
  ReturnType<CarriersRepository['findHistoryByCarrierId']>
>;

@Injectable()
export class CarriersService {
  constructor(
    private readonly carriersRepository: CarriersRepository,
    private readonly cacheService: CacheService,
  ) { }

  async list(query: ListCarriersQueryDto): Promise<ListCarriersResponse> {
    const filters: CarrierFilters = {
      minScore: query.min_score,
      maxScore: query.max_score,
      authorityStatus: query.authority_status,
      search: query.search,
    };
    const limit = query.limit ?? 20;
    const cursor = query.cursor;

    const cacheHash = createHash('sha256')
      .update(JSON.stringify({ filters, limit, cursor }))
      .digest('hex');
    const cacheKey = `carriers:list:${cacheHash}`;

    const cached = await this.cacheService.get<ListCarriersResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.carriersRepository.findWithFilters(
      filters,
      cursor,
      limit,
    );
    await this.cacheService.set(cacheKey, result, 60);
    return result;
  }

  async getById(id: string): Promise<CarrierByIdResponse> {
    const cacheKey = `carriers:detail:${id}`;
    const cached = await this.cacheService.get<CarrierByIdResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const carrier = await this.carriersRepository.findById(id);
    if (!carrier) {
      throw new NotFoundException('Carrier not found');
    }
    await this.cacheService.set(cacheKey, carrier, 120);
    return carrier;
  }

  async getHistory(id: string): Promise<CarrierHistoryResponse> {
    return this.carriersRepository.findHistoryByCarrierId(id, 50);
  }

  async invalidateCache(): Promise<void> {
    await this.cacheService.delPattern('carriers:list:*');
    await this.cacheService.delPattern('carriers:detail:*');
  }
}
