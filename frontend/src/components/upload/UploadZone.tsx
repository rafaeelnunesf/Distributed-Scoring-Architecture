'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface UploadZoneProps {
  disabled?: boolean;
  onFileAccepted: (file: File, records: unknown[]) => void;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function extractRecordsFromPayload(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if ('records' in payload) {
    const records = (payload as { records: unknown }).records;
    return Array.isArray(records) ? records : null;
  }
  if ('carriers' in payload) {
    const carriers = (payload as { carriers: unknown }).carriers;
    return Array.isArray(carriers) ? carriers : null;
  }

  return null;
}

export function UploadZone({ disabled, onFileAccepted }: UploadZoneProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const parseAndValidateFile = async (file: File): Promise<void> => {
    setError(null);

    const isJsonType = file.type.includes('json') || file.name.toLowerCase().endsWith('.json');
    if (!isJsonType) {
      setError('Arquivo invalido. Envie um arquivo .json.');
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setError('Arquivo excede 10MB.');
      return;
    }

    try {
      const content = await file.text();
      const parsed = JSON.parse(content) as unknown;
      const records = extractRecordsFromPayload(parsed);
      if (!records) {
        setError('O JSON precisa ser um array ou um objeto com "records" ou "carriers".');
        return;
      }

      setFileName(file.name);
      onFileAccepted(file, records);
    } catch {
      setError('JSON invalido.');
    }
  };

  return (
    <Card className="p-6">
      <div
        className={`rounded-lg border-2 border-dashed p-8 text-center transition ${isDragActive ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-gray-50'
          }`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragActive(false);
          if (disabled) return;
          const file = event.dataTransfer.files?.[0];
          if (!file) return;
          void parseAndValidateFile(file);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          data-testid="upload-file-input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void parseAndValidateFile(file);
          }}
        />

        <p className="text-base font-semibold text-gray-900">Arraste um JSON aqui</p>
        <p className="mt-1 text-sm text-gray-600">ou clique para selecionar um arquivo (max 10MB)</p>

        <Button
          type="button"
          variant="secondary"
          className="mt-4"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Selecionar arquivo
        </Button>

        {fileName ? <p className="mt-3 text-xs text-gray-600">Arquivo selecionado: {fileName}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    </Card>
  );
}
