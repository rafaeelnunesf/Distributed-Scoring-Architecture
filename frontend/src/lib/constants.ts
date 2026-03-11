import type { ScoreTier } from '@/types';

export const TIER_COLORS = {
  SAFE: { bg: 'bg-green-100', text: 'text-green-800', ring: '#16a34a' },
  CAUTION: { bg: 'bg-yellow-100', text: 'text-yellow-800', ring: '#ca8a04' },
  RISK: { bg: 'bg-red-100', text: 'text-red-800', ring: '#dc2626' },
} as const;

export function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

export function scoreToTier(score: number): ScoreTier {
  if (score >= 70) return 'SAFE';
  if (score >= 40) return 'CAUTION';
  return 'RISK';
}
