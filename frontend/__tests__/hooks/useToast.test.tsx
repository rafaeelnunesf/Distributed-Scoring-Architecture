import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ToastProvider, useToast } from '@/hooks/useToast';

function wrapper({ children }: { children: ReactNode }): JSX.Element {
  return <ToastProvider>{children}</ToastProvider>;
}

describe('useToast', () => {
  it('adiciona e remove toasts', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    let id = '';
    act(() => {
      id = result.current.addToast({ type: 'info', message: 'Teste' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]?.message).toBe('Teste');

    act(() => {
      result.current.removeToast(id);
    });

    expect(result.current.toasts).toHaveLength(0);
  });
});
