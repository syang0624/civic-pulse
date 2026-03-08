import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { NavBar } from '@/frontend/components/layout/nav-bar';
import { AdForm } from '@/frontend/components/generate/ad-form';

export default async function AdPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <NavBar />
      <AdContent />
    </>
  );
}

function AdContent() {
  const t = useTranslations('Generate.Ad');

  return (
    <main className="container max-w-2xl py-6">
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>
      <AdForm />
    </main>
  );
}
