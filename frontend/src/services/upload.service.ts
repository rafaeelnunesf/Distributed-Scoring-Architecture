import { buildMockProgressEvent, completeMockUpload, isMockApiEnabled } from '@/lib/mock-api';
import { apiClient } from '@/services/api-client';
import type { SSEJobEvent, UploadSummary } from '@/types';

interface UploadJobResponse {
  jobId: string;
  status: string;
  total_records: number;
}

interface SubscribeCallbacks {
  onProgress: (event: SSEJobEvent) => void;
  onComplete: (event: SSEJobEvent) => void;
  onError: (event: SSEJobEvent) => void;
}

class UploadService {
  private readonly baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

  async uploadFile(file: File): Promise<UploadJobResponse> {
    if (isMockApiEnabled()) {
      const content = await file.text();
      const parsed = JSON.parse(content) as unknown;
      const records = this.extractRecords(parsed);
      return this.uploadJson(records);
    }

    const formData = new FormData();
    formData.set('file', file);
    return apiClient.upload<UploadJobResponse>('/ccf/upload', formData);
  }

  async uploadJson(records: unknown[]): Promise<UploadJobResponse> {
    return apiClient.post<UploadJobResponse>('/ccf/upload', { records });
  }

  async getUploadHistory(): Promise<UploadSummary[]> {
    return apiClient.get<UploadSummary[]>('/ccf/uploads');
  }

  private extractRecords(payload: unknown): unknown[] {
    if (Array.isArray(payload)) {
      return payload;
    }
    if (typeof payload !== 'object' || payload === null) {
      return [];
    }
    if ('records' in payload && Array.isArray((payload as { records: unknown }).records)) {
      return (payload as { records: unknown[] }).records;
    }
    if ('carriers' in payload && Array.isArray((payload as { carriers: unknown }).carriers)) {
      return (payload as { carriers: unknown[] }).carriers;
    }
    return [];
  }

  subscribeToJobStatus(jobId: string, callbacks: SubscribeCallbacks): () => void {
    if (isMockApiEnabled()) {
      let progress = 0;
      const interval = setInterval(() => {
        progress = Math.min(progress + 20, 100);
        if (progress < 100) {
          callbacks.onProgress(buildMockProgressEvent(jobId, progress));
          return;
        }

        clearInterval(interval);
        const updatedSummary = completeMockUpload(jobId);
        callbacks.onComplete({
          jobId,
          status: 'completed',
          progress: 100,
          summary: updatedSummary ?? undefined,
        });
      }, 500);

      return () => {
        clearInterval(interval);
      };
    }

    const url = `${this.baseUrl}/ccf/upload/${jobId}/status`;
    const eventSource = new EventSource(url, { withCredentials: true });

    eventSource.onmessage = (message: MessageEvent<string>) => {
      try {
        const event = JSON.parse(message.data) as SSEJobEvent;
        if (event.status === 'completed') {
          callbacks.onComplete(event);
        } else if (event.status === 'failed') {
          callbacks.onError(event);
        } else {
          callbacks.onProgress(event);
        }
      } catch {
        callbacks.onError({
          jobId,
          status: 'failed',
          error: 'Erro ao processar evento SSE.',
        });
      }
    };

    eventSource.onerror = () => {
      callbacks.onError({
        jobId,
        status: 'failed',
        error: 'Conexao SSE interrompida.',
      });
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }
}

export const uploadService = new UploadService();
