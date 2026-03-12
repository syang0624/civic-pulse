'use client';

import { useActionState, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Loader2 } from 'lucide-react';
import { login } from '../actions';
import type { AuthState } from '../actions';

const DEMO_ACCOUNTS = [
  { email: 'demo@civicpulse.kr', password: 'Test1234' },
  { email: 'test@civicpulse.kr', password: 'Test1234' },
];

export function LoginForm({ signupSuccess }: { signupSuccess: boolean }) {
  const t = useTranslations('Auth');
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border bg-card p-10 shadow-lg animate-fade-in">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Civic Pulse</h1>
          <p className="text-muted-foreground">{t('login')}</p>
        </div>

        {signupSuccess && (
          <div className="rounded-xl bg-green-50 p-4 text-center text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            {t('signupSuccess')}
          </div>
        )}

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
              ref={emailRef}
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
              ref={passwordRef}
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-xl border bg-background/50 px-4 py-3 text-sm shadow-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? t('loggingIn') : t('login')}
          </button>
        </form>

        <div className="space-y-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-4 text-muted-foreground">
                {t('demoAccounts')}
              </span>
            </div>
          </div>
          
          <div className="grid gap-3">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  if (emailRef.current) emailRef.current.value = account.email;
                  if (passwordRef.current) passwordRef.current.value = account.password;
                  setClientError(null);
                }}
                className="group flex w-full items-center justify-between rounded-xl border border-dashed px-4 py-3 text-xs transition-colors hover:bg-secondary/50 hover:border-primary/30"
              >
                <span className="font-medium group-hover:text-primary transition-colors">{account.email}</span>
                <span className="text-muted-foreground">{account.password}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {t('noAccount')}{' '}
          <Link
            href="/signup"
            className="font-medium text-primary hover:underline underline-offset-4"
          >
            {t('signupLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
