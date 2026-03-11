import {
  CarrierBreakdown,
  CarrierTier,
  FactorExplanation,
} from '../../carriers/types/carrier.types';

export type CcfRecord = Record<string, unknown> & {
  dot_number: string;
};

export type JobStatusEvent = {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  summary?: {
    total_records: number;
    processed_records: number;
    error_count: number;
  };
  error?: string;
  metrics?: {
    total_duration_ms: number;
    chunks_processed: number;
    scoring_latency_avg_ms: number;
    persist_latency_avg_ms: number;
  };
};

export type ScoreBatchResult = {
  dot_number: string;
  legal_name: string;
  total_score: number;
  tier: CarrierTier;
  breakdown: CarrierBreakdown;
  content_hash: string;
  authority_status: string;
  raw_data: Record<string, unknown>;
  changed: boolean;
  explanations?: FactorExplanation[];
};

export type ScoreBatchResponse = {
  results: ScoreBatchResult[];
  total?: number;
  processed?: number;
  errors?: Array<{ dot_number: string; reason: string }>;
};
