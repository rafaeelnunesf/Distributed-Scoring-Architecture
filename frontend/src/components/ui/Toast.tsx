'use client';

import { useToast, type ToastItem } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const toneClasses: Record<ToastItem['type'], string> = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
};

function ToastCard({ toast, onDismiss }: ToastProps): JSX.Element {
  return (
    <div className={cn('flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm', toneClasses[toast.type])}>
      <span>{toast.message}</span>
      <button
        type="button"
        aria-label="Fechar notificacao"
        className="text-xs font-semibold opacity-70 hover:opacity-100"
        onClick={() => onDismiss(toast.id)}
      >
        x
      </button>
    </div>
  );
}

export function ToastViewport(): JSX.Element {
  const { toasts, removeToast } = useToast();

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastCard toast={toast} onDismiss={removeToast} />
        </div>
      ))}
    </div>
  );
}
