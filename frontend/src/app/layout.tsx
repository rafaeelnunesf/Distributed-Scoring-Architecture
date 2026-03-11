import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/auth/AppShell';
import { ToastViewport } from '@/components/ui/Toast';
import { ToastProvider } from '@/hooks/useToast';
import { AuthProvider } from '@/lib/auth-context';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Carrier Risk Scoring Platform',
  description: 'Carrier risk scoring dashboard',
  icons: {
    icon: '/logo.PNG',
  },
};

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
            <ToastViewport />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
