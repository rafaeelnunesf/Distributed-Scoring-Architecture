'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadService } from '@/services/upload.service';
import type { SSEJobEvent, UploadStatus, UploadSummary } from '@/types';

interface UploadState {
  jobId: string | null;
  status: UploadStatus | null;
  progress: number;
  summary: UploadSummary | null;
  error: string | null;
  isUploading: boolean;
}

interface UseUploadResult extends UploadState {
  uploadFile: (file: File) => Promise<void>;
  uploadJson: (records: unknown[]) => Promise<void>;
  reset: () => void;
}

const INITIAL_STATE: UploadState = {
  jobId: null,
  status: null,
  progress: 0,
  summary: null,
  error: null,
  isUploading: false,
};

export function useUpload(): UseUploadResult {
  const [state, setState] = useState<UploadState>(INITIAL_STATE);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const cleanup = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  }, []);

  const subscribe = useCallback(
    (jobId: string) => {
      cleanup();
      unsubscribeRef.current = uploadService.subscribeToJobStatus(jobId, {
        onProgress: (event: SSEJobEvent) => {
          setState((prev) => ({
            ...prev,
            status: event.status,
            progress: event.progress ?? prev.progress,
          }));
        },
        onComplete: (event: SSEJobEvent) => {
          setState((prev) => ({
            ...prev,
            status: 'completed',
            progress: 100,
            summary: event.summary ?? prev.summary,
            isUploading: false,
          }));
          cleanup();
        },
        onError: (event: SSEJobEvent) => {
          setState((prev) => ({
            ...prev,
            status: 'failed',
            error: event.error ?? 'Erro no processamento do upload.',
            isUploading: false,
          }));
          cleanup();
        },
      });
    },
    [cleanup],
  );

  const uploadJson = useCallback(
    async (records: unknown[]) => {
      setState({
        jobId: null,
        status: 'processing',
        progress: 5,
        summary: null,
        error: null,
        isUploading: true,
      });

      try {
        const response = await uploadService.uploadJson(records);
        setState((prev) => ({
          ...prev,
          jobId: response.jobId,
          status: 'processing',
          progress: 10,
        }));
        subscribe(response.jobId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha ao iniciar upload.';
        setState((prev) => ({
          ...prev,
          status: 'failed',
          error: message,
          isUploading: false,
        }));
      }
    },
    [subscribe],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      setState({
        jobId: null,
        status: 'processing',
        progress: 5,
        summary: null,
        error: null,
        isUploading: true,
      });

      try {
        const response = await uploadService.uploadFile(file);
        setState((prev) => ({
          ...prev,
          jobId: response.jobId,
          status: 'processing',
          progress: 10,
        }));
        subscribe(response.jobId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha ao iniciar upload.';
        setState((prev) => ({
          ...prev,
          status: 'failed',
          error: message,
          isUploading: false,
        }));
      }
    },
    [subscribe],
  );

  const reset = useCallback(() => {
    cleanup();
    setState(INITIAL_STATE);
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    ...state,
    uploadFile,
    uploadJson,
    reset,
  };
}
