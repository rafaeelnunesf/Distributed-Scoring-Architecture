'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authService } from '@/services/auth.service';

interface User {
  email: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const isAuthenticated = Boolean(user);

  useEffect(() => {
    let cancelled = false;
    authService.getMe().then((me) => {
      if (!cancelled && me) {
        setUser({ email: me.email });
      } else if (!cancelled) {
        setUser(null);
      }
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoading || !pathname) return;

    const isLoginRoute = pathname.startsWith('/login');
    if (!isAuthenticated && !isLoginRoute) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated && isLoginRoute) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await authService.login(email, password);
      setUser({ email });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await authService.register(email, password);
      setUser({ email });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    void authService.logout();
    setUser(null);
    router.replace('/login');
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated,
      login,
      register,
      logout,
    }),
    [user, isLoading, isAuthenticated, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
