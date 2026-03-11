import { Card } from '@/components/ui/Card';
import type { UploadSummary as UploadSummaryType } from '@/types';

interface UploadSummaryProps {
  summary: UploadSummaryType | null;
}

export function UploadSummary({ summary }: UploadSummaryProps): JSX.Element | null {
  if (!summary) return null;

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-gray-900">Resumo do upload</h3>
      <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700 md:grid-cols-3">
        <p>Total: {summary.total_records}</p>
        <p>Processados: {summary.processed_records}</p>
        <p>Erros: {summary.error_count}</p>
      </div>
      {summary.error_details && summary.error_details.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-red-700">
          {summary.error_details.map((detail) => (
            <li key={`${detail.dot_number}-${detail.reason}`}>
              DOT {detail.dot_number}: {detail.reason}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
