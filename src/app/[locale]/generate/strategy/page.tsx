import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { NavBar } from '@/frontend/components/layout/nav-bar';
import { StrategyForm } from '@/frontend/components/generate/strategy-form';

export default async function StrategyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <NavBar />
      <StrategyContent />
    </>
  );
}

function StrategyContent() {
  const t = useTranslations('Strategy');

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-4 py-10">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t('title')}</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground/80">{t('subtitle')}</p>
      </div>
      <Suspense>
        <StrategyForm />
      </Suspense>
    </main>
  );
}
