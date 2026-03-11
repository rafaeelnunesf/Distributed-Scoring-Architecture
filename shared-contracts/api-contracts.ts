// Carrier
export interface CarrierRecord {
  dot_number: string;
  legal_name: string;
  safety_rating?: string;
  oos_rate?: number;
  crash_total?: number;
  driver_oos_rate?: number;
  insurance_status?: string;
  authority_status?: string;
  [key: string]: unknown;
}

export interface ScoreBreakdown {
  safety_rating: number;
  oos_pct: number;
  crash_total: number;
  driver_oos: number;
  insurance: number;
  authority: number;
}

export type ScoreTier = 'SAFE' | 'CAUTION' | 'RISK';

export interface CarrierScore {
  dot_number: string;
  legal_name: string;
  total_score: number;
  tier: ScoreTier;
  breakdown: ScoreBreakdown;
  content_hash: string;
  changed: boolean;
}

// Upload
export type UploadStatus = 'processing' | 'completed' | 'failed';

export interface UploadSummary {
  jobId: string;
  status: UploadStatus;
  total: number;
  processed: number;
  errors: number;
  errorDetails?: Array<{ dot_number: string; reason: string }>;
  createdAt: string;
  completedAt?: string;
}

// Auth
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface UserPayload {
  sub: string;
  email: string;
}

// Pagination
export interface CursorPage<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
  total: number;
}

// Carrier List Filters
export interface CarrierFilters {
  min_score?: number;
  max_score?: number;
  authority_status?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}

// SSE Events
export interface SSEJobEvent {
  jobId: string;
  status: UploadStatus;
  progress?: number;
  summary?: UploadSummary;
  error?: string;
}
