'use client';

import { useMemo, useState } from 'react';
import { CarrierCard } from '@/components/carriers/CarrierCard';
import { CarrierFilters } from '@/components/carriers/CarrierFilters';
import { CarrierTable } from '@/components/carriers/CarrierTable';
import { Button } from '@/components/ui/Button';
import { useCarriers } from '@/hooks/useCarriers';
import { useDebounce } from '@/hooks/useDebounce';
import type { CarrierFilters as CarrierFiltersType } from '@/types';

export default function CarriersPage(): JSX.Element {
  const [filters, setFilters] = useState<CarrierFiltersType>({ limit: 10 });
  const debouncedSearch = useDebounce(filters.search ?? '', 350);
  const apiFilters = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch || undefined,
    }),
    [filters, debouncedSearch],
  );

  const { carriers, isLoading, isLoadingMore, error, hasMore, loadMore, retry } = useCarriers(apiFilters);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Carriers</h1>
        <p className="text-sm text-gray-600">Lista ranqueada por score de risco.</p>
      </div>

      <CarrierFilters value={filters} onChange={setFilters} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {carriers.slice(0, 6).map((carrier) => (
          <CarrierCard key={carrier._id} carrier={carrier} />
        ))}
      </div>

      <CarrierTable
        carriers={carriers}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        error={error}
        hasMore={hasMore}
        onRetry={() => {
          void retry();
        }}
        onLoadMore={() => {
          void loadMore();
        }}
      />

      {!isLoading && carriers.length === 0 && !error ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
          Nenhum carrier encontrado com os filtros atuais.
          <div className="mt-4">
            <Button variant="secondary" onClick={() => setFilters({ limit: 10 })}>
              Limpar filtros
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
