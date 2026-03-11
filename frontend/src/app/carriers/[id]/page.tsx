'use client';

import { useParams } from 'next/navigation';
import { BreakdownBar } from '@/components/carriers/BreakdownBar';
import { HistoryTimeline } from '@/components/carriers/HistoryTimeline';
import { ScoreRing } from '@/components/carriers/ScoreRing';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCarrier } from '@/hooks/useCarrier';
import { useCarrierHistory } from '@/hooks/useCarrierHistory';
import { formatDate, truncateMiddle } from '@/lib/utils';

export default function CarrierDetailPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const carrierId = typeof params.id === 'string' ? params.id : '';
  const { carrier, isLoading, error, retry } = useCarrier(carrierId);
  const {
    history,
    isLoading: isHistoryLoading,
    error: historyError,
    retry: retryHistory,
  } = useCarrierHistory(carrierId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (error || !carrier) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">Nao foi possivel carregar o carrier. {error ?? ''}</p>
        <Button className="mt-4" variant="secondary" onClick={() => void retry()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{carrier.legal_name}</h1>
            <p className="mt-1 font-mono text-xs text-gray-500">DOT# {carrier.dot_number}</p>
            <p className="mt-2 text-sm text-gray-600">Ultima atualizacao: {formatDate(carrier.lastUpdatedAt)}</p>
          </div>
          <Badge tier={carrier.tier} />
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Score</h2>
          <ScoreRing score={carrier.total_score} tier={carrier.tier} />
        </Card>

        <Card className="space-y-3 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Breakdown</h2>
          <BreakdownBar label="Safety Rating" value={carrier.breakdown.safety_rating} max={25} />
          <BreakdownBar label="OOS Rate" value={carrier.breakdown.oos_pct} max={20} />
          <BreakdownBar label="Crash Total" value={carrier.breakdown.crash_total} max={20} />
          <BreakdownBar label="Driver OOS" value={carrier.breakdown.driver_oos} max={15} />
          <BreakdownBar label="Insurance" value={carrier.breakdown.insurance} max={10} />
          <BreakdownBar label="Authority" value={carrier.breakdown.authority} max={10} />
          {carrier.explanations && carrier.explanations.length > 0 ? (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Per-factor explanation</h3>
              <ul className="space-y-1.5 text-xs text-gray-600">
                {carrier.explanations.map((ex) => (
                  <li key={ex.factor}>
                    <span className="font-medium text-gray-800">{ex.factor}:</span> {ex.description}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">History Timeline</h2>
            {historyError ? (
              <Button variant="secondary" size="sm" onClick={() => void retryHistory()}>
                Tentar novamente
              </Button>
            ) : null}
          </div>
          {isHistoryLoading ? <Skeleton className="h-32 w-full" /> : <HistoryTimeline history={history} />}
          {historyError ? <p className="mt-3 text-sm text-red-600">{historyError}</p> : null}
        </Card>

        <Card className="space-y-3 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Meta Info</h2>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Authority status:</span> {carrier.authority_status}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Content hash:</span>{' '}
            <span className="font-mono text-xs">{truncateMiddle(carrier.content_hash)}</span>
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Criado em:</span> {formatDate(carrier.createdAt)}
          </p>
        </Card>
      </section>
    </div>
  );
}
