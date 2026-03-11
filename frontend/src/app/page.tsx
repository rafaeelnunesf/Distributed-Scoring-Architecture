'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CarrierFilters } from '@/components/carriers/CarrierFilters';
import { CarrierTable } from '@/components/carriers/CarrierTable';
import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/Button';
import { UploadProgress } from '@/components/upload/UploadProgress';
import { UploadSummary } from '@/components/upload/UploadSummary';
import { UploadZone } from '@/components/upload/UploadZone';
import { useCarriers } from '@/hooks/useCarriers';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import { useUpload } from '@/hooks/useUpload';
import type { CarrierFilters as CarrierFiltersType } from '@/types';

export default function HomePage(): JSX.Element {
  const [filters, setFilters] = useState<CarrierFiltersType>({ limit: 10 });
  const debouncedSearch = useDebounce(filters.search ?? '', 350);
  const apiFilters = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch || undefined,
    }),
    [filters, debouncedSearch],
  );

  const { carriers, isLoading, isLoadingMore, error, hasMore, total, loadMore, retry } = useCarriers(apiFilters);
  const upload = useUpload();
  const { addToast } = useToast();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const completedToastRef = useRef<string | null>(null);
  const failedToastRef = useRef<string | null>(null);

  useEffect(() => {
    if (upload.status !== 'completed' || !upload.jobId || completedToastRef.current === upload.jobId) return;

    completedToastRef.current = upload.jobId;
    addToast({
      type: 'success',
      message: `Upload concluido. ${upload.summary?.processed_records ?? 0} processados, ${upload.summary?.error_count ?? 0
        } erros.`,
    });
    setSelectedFile(null);
    setSelectedCount(0);
    void retry();
  }, [upload.status, upload.jobId, upload.summary, addToast, retry]);

  useEffect(() => {
    if (upload.status !== 'failed' || !upload.jobId || failedToastRef.current === upload.jobId) return;

    failedToastRef.current = upload.jobId;
    addToast({
      type: 'error',
      message: upload.error ?? 'Falha ao processar upload.',
    });
  }, [upload.status, upload.jobId, upload.error, addToast]);

  const averageScore = carriers.length
    ? (carriers.reduce((acc, carrier) => acc + carrier.total_score, 0) / carriers.length).toFixed(1)
    : '0.0';
  const riskCount = carriers.filter((carrier) => carrier.tier === 'RISK').length;
  const safeCount = carriers.filter((carrier) => carrier.tier === 'SAFE').length;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Carriers" value={String(total)} icon="🚚" />
        <StatCard label="Score Medio" value={averageScore} icon="📈" />
        <StatCard label="Em Risco (RISK)" value={String(riskCount)} icon="⚠️" />
        <StatCard label="Seguros (SAFE)" value={String(safeCount)} icon="✅" />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Upload CCF</h2>
        <UploadZone
          disabled={upload.isUploading}
          onFileAccepted={(file, records) => {
            setSelectedFile(file);
            setSelectedCount(records.length);
            upload.reset();
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => {
              if (!selectedFile) {
                addToast({ type: 'info', message: 'Selecione um arquivo JSON antes do upload.' });
                return;
              }
              void upload.uploadFile(selectedFile);
            }}
            disabled={!selectedFile || upload.isUploading}
          >
            Upload CCF
          </Button>
          {selectedFile ? (
            <p className="text-xs text-gray-600">
              {selectedFile.name} ({selectedCount} registros)
            </p>
          ) : null}
        </div>
        <UploadProgress progress={upload.progress} status={upload.status} />
        <UploadSummary summary={upload.summary} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Carriers</h2>
        <CarrierFilters value={filters} onChange={setFilters} />
        <CarrierTable
          carriers={carriers}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          error={error}
          hasMore={hasMore}
          onRetry={() => {
            void retry();
          }}
          onLoadMore={() => {
            void loadMore();
          }}
        />
      </section>
    </div>
  );
}
