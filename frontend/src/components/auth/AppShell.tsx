'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/lib/auth-context';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps): JSX.Element {
  const { isLoading, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const isLoginRoute = pathname.startsWith('/login');

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (isLoginRoute) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <img src="/logo.PNG" alt="Carrier Assure" className="h-8 w-auto" />
              Carrier Assure
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              <Link href="/" className="text-gray-700 hover:text-blue-700">
                Dashboard
              </Link>
              <Link href="/carriers" className="text-gray-700 hover:text-blue-700">
                Carriers
              </Link>
            </nav>
          </div>
          {isAuthenticated ? (
            <Button variant="ghost" size="sm" onClick={logout}>
              Logout
            </Button>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}
