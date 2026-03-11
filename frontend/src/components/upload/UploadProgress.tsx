import { ProgressBar } from '@/components/ui/ProgressBar';
import type { UploadStatus } from '@/types';

interface UploadProgressProps {
  progress: number;
  status: UploadStatus | null;
}

export function UploadProgress({ progress, status }: UploadProgressProps): JSX.Element | null {
  if (!status) return null;

  return (
    <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between text-sm">
        <p className="font-medium text-gray-800">Status: {status}</p>
        <p className="font-semibold text-gray-700">{Math.round(progress)}%</p>
      </div>
      <ProgressBar value={progress} />
    </div>
  );
}
