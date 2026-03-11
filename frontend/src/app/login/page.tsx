'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage(): JSX.Element {
  const { login, register, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const registerMode = useMemo(() => searchParams.get('mode') === 'register', [searchParams]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);

    try {
      if (registerMode) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      router.push('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Credenciais invalidas.';
      setError(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold text-gray-900">{registerMode ? 'Criar conta' : 'Login'}</h1>
        <p className="mt-1 text-sm text-gray-600">Acesse o dashboard de monitoramento de carriers.</p>

        <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <Input
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            id="password"
            label="Senha"
            type="password"
            autoComplete={registerMode ? 'new-password' : 'current-password'}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button className="w-full" type="submit" disabled={isLoading}>
            {registerMode ? 'Criar conta' : 'Login'}
          </Button>
        </form>

        <p className="mt-4 text-sm text-gray-600">
          {registerMode ? 'Ja possui conta?' : 'Nao possui conta?'}{' '}
          <Link href={registerMode ? '/login' : '/login?mode=register'} className="font-semibold text-blue-700">
            {registerMode ? 'Entrar' : 'Criar conta'}
          </Link>
        </p>
      </Card>
    </div>
  );
}
