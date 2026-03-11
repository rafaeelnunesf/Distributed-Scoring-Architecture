'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, error, helperText, className, ...props },
  ref,
) {
  return (
    <div className="flex w-full flex-col gap-1">
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-gray-800">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={id}
        className={cn(
          'w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200',
          error ? 'border-red-400' : 'border-gray-200',
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      {!error && helperText ? <span className="text-xs text-gray-500">{helperText}</span> : null}
    </div>
  );
});
