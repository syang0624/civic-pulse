import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { NavBar } from '@/frontend/components/layout/nav-bar';
import { EmailForm } from '@/frontend/components/generate/email-form';

export default async function EmailPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <NavBar />
      <EmailContent />
    </>
  );
}

function EmailContent() {
  const t = useTranslations('Generate.Email');

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-4 py-10">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">{t('title')}</h1>
        <p className="text-lg text-muted-foreground/80 max-w-2xl leading-relaxed">{t('subtitle')}</p>
      </div>
      <Suspense>
        <EmailForm />
      </Suspense>
    </main>
  );
}
