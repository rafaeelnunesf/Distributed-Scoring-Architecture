export type ScoreTier = 'SAFE' | 'CAUTION' | 'RISK';
export type UploadStatus = 'processing' | 'completed' | 'failed';

export interface ScoreBreakdown {
  safety_rating: number;
  oos_pct: number;
  crash_total: number;
  driver_oos: number;
  insurance: number;
  authority: number;
}

export interface FactorExplanation {
  factor: string;
  points: number;
  max_points: number;
  weight_pct: number;
  input_value: string | number | null;
  description: string;
}

export interface Carrier {
  _id: string;
  dot_number: string;
  legal_name: string;
  total_score: number;
  tier: ScoreTier;
  breakdown: ScoreBreakdown;
  content_hash: string;
  authority_status: string;
  lastUpdatedAt: string;
  createdAt: string;
  explanations?: FactorExplanation[];
}

export interface CarrierHistory {
  _id: string;
  total_score: number;
  tier: ScoreTier;
  breakdown: ScoreBreakdown;
  recordedAt: string;
}

export interface CursorPage<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

export interface UploadSummary {
  jobId?: string;
  status?: UploadStatus;
  total_records: number;
  processed_records: number;
  error_count: number;
  error_details?: Array<{ dot_number: string; reason: string }>;
  createdAt?: string;
  completedAt?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface CarrierFilters {
  min_score?: number;
  max_score?: number;
  authority_status?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}

export interface SSEJobEvent {
  jobId: string;
  status: UploadStatus;
  progress?: number;
  summary?: UploadSummary;
  error?: string;
}
