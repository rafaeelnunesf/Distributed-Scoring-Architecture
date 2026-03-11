'use client';

import { useCallback, useEffect, useState } from 'react';
import { carriersService } from '@/services/carriers.service';
import type { CarrierHistory } from '@/types';

interface UseCarrierHistoryResult {
  history: CarrierHistory[];
  isLoading: boolean;
  error: string | null;
  retry: () => Promise<void>;
}

export function useCarrierHistory(id: string): UseCarrierHistoryResult {
  const [history, setHistory] = useState<CarrierHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await carriersService.getHistory(id);
      setHistory(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar historico.';
      setError(message);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  return { history, isLoading, error, retry: fetchHistory };
}
