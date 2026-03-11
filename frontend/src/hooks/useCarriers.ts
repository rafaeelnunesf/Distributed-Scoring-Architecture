'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { carriersService } from '@/services/carriers.service';
import type { Carrier, CarrierFilters } from '@/types';

interface UseCarriersResult {
  carriers: Carrier[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  total: number;
  loadMore: () => Promise<void>;
  retry: () => Promise<void>;
}

export function useCarriers(filters: CarrierFilters): UseCarriersResult {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const fetchFirstPage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const page = await carriersService.list({ ...filters, cursor: undefined });
      setCarriers(page.data);
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor);
      setTotal(page.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar carriers.';
      setError(message);
      setCarriers([]);
      setHasMore(false);
      setNextCursor(null);
    } finally {
      setIsLoading(false);
    }
  }, [filterKey, filters]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const page = await carriersService.list({ ...filters, cursor: nextCursor });
      setCarriers((prev) => [...prev, ...page.data]);
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor);
      setTotal(page.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar mais carriers.';
      setError(message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [filters, isLoadingMore, nextCursor]);

  useEffect(() => {
    void fetchFirstPage();
  }, [fetchFirstPage]);

  return {
    carriers,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    total,
    loadMore,
    retry: fetchFirstPage,
  };
}
