import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  className?: string;
}

export function ProgressBar({ value, className }: ProgressBarProps): JSX.Element {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn('w-full rounded-full bg-gray-200', className)} aria-label="Barra de progresso">
      <div
        className="h-2 rounded-full bg-blue-600 transition-all"
        style={{ width: `${clampedValue}%` }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clampedValue)}
      />
    </div>
  );
}
