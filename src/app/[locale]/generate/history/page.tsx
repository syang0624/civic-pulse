import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { NavBar } from '@/frontend/components/layout/nav-bar';

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <NavBar />
      <HistoryContent />
    </>
  );
}

function HistoryContent() {
  const t = useTranslations('Nav');

  return (
    <main className="container py-6">
      <h1 className="text-2xl font-bold">{t('history')}</h1>
      <p className="mt-2 text-muted-foreground">Coming soon</p>
    </main>
  );
}
