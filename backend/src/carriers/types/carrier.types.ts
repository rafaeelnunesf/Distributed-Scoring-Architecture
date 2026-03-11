export type CarrierBreakdown = {
  safety_rating: number;
  oos_pct: number;
  crash_total: number;
  driver_oos: number;
  insurance: number;
  authority: number;
};

export type FactorExplanation = {
  factor: string;
  points: number;
  max_points: number;
  weight_pct: number;
  input_value: string | number | null;
  description: string;
};

export type CarrierTier = 'SAFE' | 'CAUTION' | 'RISK';

export type CarrierFilters = {
  minScore?: number;
  maxScore?: number;
  authorityStatus?: string;
  search?: string;
};

export type CarrierUpsertInput = {
  dot_number: string;
  legal_name: string;
  total_score: number;
  tier: CarrierTier;
  breakdown: CarrierBreakdown;
  content_hash: string;
  authority_status: string;
  raw_data: Record<string, unknown>;
  lastUpdatedAt: Date;
  explanations?: FactorExplanation[];
};

export type CarrierHistoryEntryInput = {
  carrier_id: string;
  dot_number: string;
  total_score: number;
  tier: CarrierTier;
  breakdown: CarrierBreakdown;
  content_hash: string;
  recordedAt: Date;
};
