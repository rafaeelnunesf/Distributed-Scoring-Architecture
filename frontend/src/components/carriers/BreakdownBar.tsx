import { cn } from '@/lib/utils';

interface BreakdownBarProps {
  label: string;
  value: number;
  max: number;
  className?: string;
}

export function BreakdownBar({ label, value, max, className }: BreakdownBarProps): JSX.Element {
  const ratio = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className={cn('grid grid-cols-[140px_1fr_auto] items-center gap-3 text-sm', className)}>
      <span className="font-medium text-gray-700">{label}</span>
      <div className="h-3 rounded-full bg-gray-200">
        <div className="h-3 rounded-full bg-blue-600" style={{ width: `${ratio}%` }} />
      </div>
      <span className="font-mono text-xs text-gray-600">
        {value}/{max}
      </span>
    </div>
  );
}
