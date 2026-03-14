'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Loader2 } from 'lucide-react';
import { signup } from '../actions';
import type { AuthState } from '../actions';
import { LocaleToggle } from '@/frontend/components/layout/locale-toggle';

export function SignupForm() {
  const t = useTranslations('Auth');
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    signup,
    { error: null },
  );
  const [clientError, setClientError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    setClientError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

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

    if (email.trim().toLowerCase().startsWith('admin@')) {
      e.preventDefault();
      setClientError(t('adminEmailBlocked'));
      return;
    }

    if (!password || password.length < 8) {
      e.preventDefault();
      setClientError(t('passwordMin'));
      return;
    }

    if (password !== confirmPassword) {
      e.preventDefault();
      setClientError(t('passwordMismatch'));
      return;
    }
  }

  const error = isPending ? null : clientError || state.error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="fixed top-4 right-4 z-10">
        <LocaleToggle />
      </div>
      <div className="w-full max-w-md space-y-8 rounded-2xl border bg-card p-10 shadow-lg animate-fade-in">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Civic Pulse</h1>
          <p className="text-muted-foreground">{t('signup')}</p>
        </div>

        {error && (
          <div className="rounded-xl bg-destructive/10 p-4 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        <form
          action={formAction}
          onSubmit={handleSubmit}
          noValidate
          className="space-y-6"
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
              className="w-full rounded-xl border bg-background/50 px-4 py-3 text-sm shadow-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
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
              autoComplete="new-password"
              className="w-full rounded-xl border bg-background/50 px-4 py-3 text-sm shadow-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              {t('confirmPassword')}
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="w-full rounded-xl border bg-background/50 px-4 py-3 text-sm shadow-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? t('signingUp') : t('signup')}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {t('hasAccount')}{' '}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline underline-offset-4"
          >
            {t('loginLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
