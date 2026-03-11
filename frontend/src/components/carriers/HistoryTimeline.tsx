import { formatDate } from '@/lib/utils';
import type { CarrierHistory } from '@/types';

interface HistoryTimelineProps {
  history: CarrierHistory[];
}

export function HistoryTimeline({ history }: HistoryTimelineProps): JSX.Element {
  if (history.length === 0) {
    return <p className="text-sm text-gray-500">Sem historico de score para este carrier.</p>;
  }

  const ordered = [...history].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

  return (
    <ol className="space-y-4">
      {ordered.map((entry, index) => {
        const older = ordered[index + 1];
        const delta = older ? entry.total_score - older.total_score : 0;
        const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
        const deltaText = delta === 0 ? '0' : `${delta > 0 ? '+' : ''}${delta}`;

        return (
          <li key={entry._id} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{entry.total_score}/100</p>
                <p className="text-xs text-gray-500">{formatDate(entry.recordedAt)}</p>
              </div>
              <p className="text-sm font-medium text-gray-700">
                {arrow} {deltaText}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
