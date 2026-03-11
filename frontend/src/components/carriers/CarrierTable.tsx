'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { getScoreColor } from '@/lib/constants';
import { formatDate } from '@/lib/utils';
import type { Carrier } from '@/types';

interface CarrierTableProps {
  carriers: Carrier[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
}

type SortKey = 'legal_name' | 'total_score' | 'lastUpdatedAt';

export function CarrierTable({
  carriers,
  isLoading,
  isLoadingMore,
  error,
  hasMore,
  onRetry,
  onLoadMore,
}: CarrierTableProps): JSX.Element {
  const [sortKey, setSortKey] = useState<SortKey>('total_score');
  const [sortAsc, setSortAsc] = useState(false);

  const rows = useMemo(() => {
    return [...carriers].sort((a, b) => {
      const direction = sortAsc ? 1 : -1;
      if (sortKey === 'legal_name') return a.legal_name.localeCompare(b.legal_name) * direction;
      if (sortKey === 'lastUpdatedAt') return (a.lastUpdatedAt.localeCompare(b.lastUpdatedAt) || 0) * direction;
      return (a.total_score - b.total_score) * direction;
    });
  }, [carriers, sortAsc, sortKey]);

  const toggleSort = (key: SortKey): void => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
      return;
    }
    setSortKey(key);
    setSortAsc(key === 'legal_name');
  };

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={`carrier-table-skeleton-${index + 1}`} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p>Erro ao carregar carriers: {error}</p>
        <Button className="mt-3" variant="secondary" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
        Nenhum carrier encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-[900px] w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-700">
              <th className="px-4 py-3">DOT#</th>
              <th className="px-4 py-3">
                <button type="button" className="font-semibold hover:text-blue-700" onClick={() => toggleSort('legal_name')}>
                  Nome
                </button>
              </th>
              <th className="px-4 py-3">
                <button
                  type="button"
                  className="font-semibold hover:text-blue-700"
                  onClick={() => toggleSort('total_score')}
                >
                  Score
                </button>
              </th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Autoridade</th>
              <th className="px-4 py-3">
                <button
                  type="button"
                  className="font-semibold hover:text-blue-700"
                  onClick={() => toggleSort('lastUpdatedAt')}
                >
                  Ultima atualizacao
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((carrier) => (
              <tr key={carrier._id} className="border-b border-gray-100 text-gray-700 last:border-none">
                <td className="px-4 py-3 font-mono text-xs">{carrier.dot_number}</td>
                <td className="px-4 py-3">
                  <Link href={`/carriers/${carrier._id}`} className="font-medium text-gray-900 hover:text-blue-700">
                    {carrier.legal_name}
                  </Link>
                </td>
                <td className={`px-4 py-3 font-bold ${getScoreColor(carrier.total_score)}`}>{carrier.total_score}</td>
                <td className="px-4 py-3">
                  <Badge tier={carrier.tier} />
                </td>
                <td className="px-4 py-3">{carrier.authority_status}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(carrier.lastUpdatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore ? (
        <Button variant="secondary" onClick={onLoadMore} disabled={isLoadingMore}>
          {isLoadingMore ? 'Carregando...' : 'Carregar mais'}
        </Button>
      ) : null}
    </div>
  );
}
