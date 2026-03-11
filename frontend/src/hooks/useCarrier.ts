'use client';

import { useCallback, useEffect, useState } from 'react';
import { carriersService } from '@/services/carriers.service';
import type { Carrier } from '@/types';

interface UseCarrierResult {
  carrier: Carrier | null;
  isLoading: boolean;
  error: string | null;
  retry: () => Promise<void>;
}

export function useCarrier(id: string): UseCarrierResult {
  const [carrier, setCarrier] = useState<Carrier | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCarrier = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await carriersService.getById(id);
      setCarrier(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar carrier.';
      setError(message);
      setCarrier(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchCarrier();
  }, [fetchCarrier]);

  return { carrier, isLoading, error, retry: fetchCarrier };
}
