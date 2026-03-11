import { scoreToTier, TIER_COLORS } from '@/lib/constants';
import type { ScoreTier } from '@/types';

interface ScoreRingProps {
  score: number;
  tier?: ScoreTier;
  size?: number;
}

export function ScoreRing({ score, tier, size = 180 }: ScoreRingProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, score));
  const resolvedTier = tier ?? scoreToTier(clamped);
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (clamped / 100) * circumference;
  const offset = circumference - progress;

  return (
    <div className="flex items-center justify-center">
      <svg width={size} height={size} role="img" aria-label={`Score ${clamped}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={TIER_COLORS[resolvedTier].ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-gray-900 text-4xl font-bold">
          {Math.round(clamped)}
        </text>
        <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle" className="fill-gray-500 text-sm">
          /100
        </text>
      </svg>
    </div>
  );
}
