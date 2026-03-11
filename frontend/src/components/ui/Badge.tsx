import { TIER_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { ScoreTier } from '@/types';

interface BadgeProps {
  tier: ScoreTier;
  className?: string;
}

export function Badge({ tier, className }: BadgeProps): JSX.Element {
  const palette = TIER_COLORS[tier];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        palette.bg,
        palette.text,
        className,
      )}
    >
      {tier}
    </span>
  );
}
