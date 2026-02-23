'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Loader2 } from 'lucide-react';
import { login } from '../actions';
import type { AuthState } from '../actions';

export function LoginForm({ signupSuccess }: { signupSuccess: boolean }) {
  const t = useTranslations('Auth');
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    login,
    { error: null },
  );
  const [clientError, setClientError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    setClientError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email) {
      e.preventDefault();
      setClientError(t('emailRequired'));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.preventDefault();
      setClientError(t('emailInvalid'));
      return;
    }

    if (!password || password.length < 8) {
      e.preventDefault();
      setClientError(t('passwordMin'));
      return;
    }
  }

  const error = isPending ? null : clientError || state.error;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 rounded-lg border p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Civic Pulse</h1>
          <p className="text-sm text-muted-foreground">{t('login')}</p>
        </div>

        {signupSuccess && (
          <div className="rounded-md bg-green-50 p-3 text-center text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            {t('signupSuccess')}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        <form
          action={formAction}
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4"
        >
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              {t('email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="name@example.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              {t('password')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? t('loggingIn') : t('login')}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {t('noAccount')}{' '}
          <Link
            href="/signup"
            className="font-medium text-primary hover:underline"
          >
            {t('signupLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
