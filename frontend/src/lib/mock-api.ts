import { scoreToTier } from '@/lib/constants';
import type {
  AuthTokens,
  Carrier,
  CarrierHistory,
  CursorPage,
  ScoreBreakdown,
  SSEJobEvent,
  UploadSummary,
} from '@/types';

interface MockRequestOptions {
  method: 'GET' | 'POST' | 'UPLOAD';
  path: string;
  params?: Record<string, string>;
  body?: unknown;
  accessToken?: string | null;
}

export class MockApiError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

const DEFAULT_LATENCY_MS = 180;

function nowIso(): string {
  return new Date().toISOString();
}

function makeBreakdown(totalScore: number): ScoreBreakdown {
  const safety = Math.min(25, Math.max(0, Math.round((totalScore / 100) * 25)));
  const oos = Math.min(20, Math.max(0, Math.round((totalScore / 100) * 20)));
  const crash = Math.min(20, Math.max(0, Math.round((totalScore / 100) * 20)));
  const driver = Math.min(15, Math.max(0, Math.round((totalScore / 100) * 15)));
  const insurance = totalScore > 45 ? 10 : 6;
  const authority = totalScore > 55 ? 10 : 5;

  return {
    safety_rating: safety,
    oos_pct: oos,
    crash_total: crash,
    driver_oos: driver,
    insurance,
    authority,
  };
}

function createCarrier(
  id: string,
  dot: string,
  legalName: string,
  totalScore: number,
  authorityStatus: string,
): Carrier {
  const createdAt = nowIso();
  return {
    _id: id,
    dot_number: dot,
    legal_name: legalName,
    total_score: totalScore,
    tier: scoreToTier(totalScore),
    breakdown: makeBreakdown(totalScore),
    content_hash: `hash_${id}_${Math.random().toString(36).slice(2, 12)}`,
    authority_status: authorityStatus,
    lastUpdatedAt: createdAt,
    createdAt,
  };
}

let carriersDb: Carrier[] = [
  createCarrier('c1', '100001', 'Northwind Logistics', 84, 'ACTIVE'),
  createCarrier('c2', '100002', 'Blue Delta Freight', 67, 'ACTIVE'),
  createCarrier('c3', '100003', 'Red Canyon Trucking', 39, 'INACTIVE'),
  createCarrier('c4', '100004', 'Green Arrow Haulers', 73, 'ACTIVE'),
  createCarrier('c5', '100005', 'Atlas Carriers LLC', 28, 'SUSPENDED'),
];

let historyDb: Record<string, CarrierHistory[]> = {
  c1: [
    { _id: 'h1', total_score: 78, tier: 'SAFE', breakdown: makeBreakdown(78), recordedAt: nowIso() },
    { _id: 'h2', total_score: 84, tier: 'SAFE', breakdown: makeBreakdown(84), recordedAt: nowIso() },
  ],
  c2: [
    { _id: 'h3', total_score: 62, tier: 'CAUTION', breakdown: makeBreakdown(62), recordedAt: nowIso() },
    { _id: 'h4', total_score: 67, tier: 'CAUTION', breakdown: makeBreakdown(67), recordedAt: nowIso() },
  ],
};

let uploadsDb: UploadSummary[] = [
  {
    jobId: 'job_seed_1',
    status: 'completed',
    total_records: 120,
    processed_records: 120,
    error_count: 2,
    error_details: [
      { dot_number: '999100', reason: 'Missing legal_name' },
      { dot_number: '999101', reason: 'Invalid authority_status' },
    ],
    createdAt: nowIso(),
    completedAt: nowIso(),
  },
];

const pendingJobs = new Map<string, number>();

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toBase64(value: string): string {
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(value);
  }
  return value;
}

function buildMockTokens(email: string): AuthTokens {
  const payload = toBase64(JSON.stringify({ email, exp: Date.now() + 60 * 60 * 1000 }));
  return {
    access_token: `mock.${payload}.sig`,
    refresh_token: `refresh.${toBase64(email)}`,
  };
}

function requireAuth(accessToken: string | null | undefined): void {
  if (!accessToken) {
    throw new MockApiError(401, 'Unauthorized');
  }
}

function pickUploads(): UploadSummary[] {
  return [...uploadsDb].sort((a, b) =>
    (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return {};
  return value as Record<string, unknown>;
}

async function extractUploadCount(body: unknown): Promise<number> {
  if (Array.isArray(body)) return body.length;

  const recordBody = asRecord(body);
  const records = recordBody.records;
  if (Array.isArray(records)) return records.length;
  const carriers = recordBody.carriers;
  if (Array.isArray(carriers)) return carriers.length;

  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const file = body.get('file');
    if (file && typeof File !== 'undefined' && file instanceof File) {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed.length;
      const parsedRecord = asRecord(parsed);
      if (Array.isArray(parsedRecord.records)) return parsedRecord.records.length;
      if (Array.isArray(parsedRecord.carriers)) return parsedRecord.carriers.length;
    }
  }

  return 0;
}

function paginateCarriers(
  source: Carrier[],
  params: Record<string, string> | undefined,
): CursorPage<Carrier> {
  const limit = params?.limit ? Number(params.limit) : 10;
  const cursor = params?.cursor ? Number(params.cursor) : 0;
  const safeLimit = Number.isNaN(limit) ? 10 : Math.max(1, Math.min(50, limit));
  const safeCursor = Number.isNaN(cursor) ? 0 : Math.max(0, cursor);

  const data = source.slice(safeCursor, safeCursor + safeLimit);
  const nextCursor = safeCursor + safeLimit < source.length ? String(safeCursor + safeLimit) : null;
  return {
    data,
    nextCursor,
    hasMore: nextCursor !== null,
    total: source.length,
  };
}

function filterCarriers(params: Record<string, string> | undefined): Carrier[] {
  return carriersDb.filter((carrier) => {
    if (params?.min_score && carrier.total_score < Number(params.min_score)) return false;
    if (params?.max_score && carrier.total_score > Number(params.max_score)) return false;
    if (params?.authority_status && carrier.authority_status !== params.authority_status) return false;
    if (params?.search) {
      const q = params.search.toLowerCase();
      const text = `${carrier.dot_number} ${carrier.legal_name}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });
}

export function isMockApiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MOCK_API === 'true';
}

export function completeMockUpload(jobId: string): UploadSummary | null {
  const target = uploadsDb.find((item) => item.jobId === jobId);
  if (!target) return null;
  target.status = 'completed';
  target.processed_records = target.total_records;
  target.completedAt = nowIso();
  pendingJobs.delete(jobId);
  return target;
}

export function buildMockProgressEvent(jobId: string, progress: number): SSEJobEvent {
  return {
    jobId,
    status: progress >= 100 ? 'completed' : 'processing',
    progress,
    summary: progress >= 100 ? uploadsDb.find((item) => item.jobId === jobId) : undefined,
  };
}

export async function mockRequest<T>(options: MockRequestOptions): Promise<T> {
  await wait(DEFAULT_LATENCY_MS);

  const { method, path, params, body, accessToken } = options;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (method === 'POST' && cleanPath === '/auth/login') {
    const payload = asRecord(body);
    const emailValue = payload.email;
    if (typeof emailValue !== 'string') {
      throw new MockApiError(400, 'Invalid credentials');
    }
    return buildMockTokens(emailValue) as T;
  }

  if (method === 'POST' && cleanPath === '/auth/register') {
    const payload = asRecord(body);
    const emailValue = payload.email;
    if (typeof emailValue !== 'string') {
      throw new MockApiError(400, 'Invalid user');
    }
    return buildMockTokens(emailValue) as T;
  }

  if (method === 'POST' && cleanPath === '/auth/refresh') {
    const payload = asRecord(body);
    if (typeof payload.refresh_token !== 'string') {
      throw new MockApiError(401, 'Refresh token missing');
    }
    const refreshed = buildMockTokens('user@carrierassure.local');
    return { access_token: refreshed.access_token } as T;
  }

  requireAuth(accessToken);

  if (method === 'GET' && cleanPath === '/carriers') {
    const filtered = filterCarriers(params);
    return paginateCarriers(filtered, params) as T;
  }

  if (method === 'GET' && cleanPath.startsWith('/carriers/') && cleanPath.endsWith('/history')) {
    const carrierId = cleanPath.replace('/carriers/', '').replace('/history', '');
    return (historyDb[carrierId] ?? []) as T;
  }

  if (method === 'GET' && cleanPath.startsWith('/carriers/')) {
    const carrierId = cleanPath.replace('/carriers/', '');
    const carrier = carriersDb.find((item) => item._id === carrierId);
    if (!carrier) throw new MockApiError(404, 'Carrier not found');
    return carrier as T;
  }

  if ((method === 'POST' || method === 'UPLOAD') && cleanPath === '/ccf/upload') {
    const totalRecords = await extractUploadCount(body);
    const jobId = `job_${Date.now()}`;
    const createdAt = nowIso();
    const upload: UploadSummary = {
      jobId,
      status: 'processing',
      total_records: totalRecords,
      processed_records: 0,
      error_count: 0,
      createdAt,
    };
    uploadsDb = [upload, ...uploadsDb];
    pendingJobs.set(jobId, totalRecords);
    return { jobId, status: 'processing', total_records: totalRecords } as T;
  }

  if (method === 'GET' && cleanPath === '/ccf/uploads') {
    return pickUploads() as T;
  }

  throw new MockApiError(404, `Mock route not found: ${method} ${cleanPath}`);
}

export function resetMockData(): void {
  carriersDb = [
    createCarrier('c1', '100001', 'Northwind Logistics', 84, 'ACTIVE'),
    createCarrier('c2', '100002', 'Blue Delta Freight', 67, 'ACTIVE'),
    createCarrier('c3', '100003', 'Red Canyon Trucking', 39, 'INACTIVE'),
    createCarrier('c4', '100004', 'Green Arrow Haulers', 73, 'ACTIVE'),
    createCarrier('c5', '100005', 'Atlas Carriers LLC', 28, 'SUSPENDED'),
  ];
  historyDb = {
    c1: [{ _id: 'h1', total_score: 84, tier: 'SAFE', breakdown: makeBreakdown(84), recordedAt: nowIso() }],
    c2: [{ _id: 'h2', total_score: 67, tier: 'CAUTION', breakdown: makeBreakdown(67), recordedAt: nowIso() }],
  };
  uploadsDb = [];
  pendingJobs.clear();
}
