import { apiClient } from '@/services/api-client';
import type { Carrier, CarrierFilters, CarrierHistory, CursorPage } from '@/types';

function buildCarrierParams(filters: CarrierFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.min_score !== undefined) params.min_score = String(filters.min_score);
  if (filters.max_score !== undefined) params.max_score = String(filters.max_score);
  if (filters.authority_status) params.authority_status = filters.authority_status;
  if (filters.search) params.search = filters.search;
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  if (filters.cursor) params.cursor = filters.cursor;
  return params;
}

class CarriersService {
  async list(filters: CarrierFilters): Promise<CursorPage<Carrier>> {
    return apiClient.get<CursorPage<Carrier>>('/carriers', buildCarrierParams(filters));
  }

  async getById(id: string): Promise<Carrier> {
    return apiClient.get<Carrier>(`/carriers/${id}`);
  }

  async getHistory(id: string): Promise<CarrierHistory[]> {
    return apiClient.get<CarrierHistory[]>(`/carriers/${id}/history`);
  }
}

export const carriersService = new CarriersService();
