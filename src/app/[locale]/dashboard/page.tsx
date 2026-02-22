import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { NavBar } from '@/frontend/components/layout/nav-bar';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <NavBar />
      <DashboardContent />
    </>
  );
}

function DashboardContent() {
  const t = useTranslations('Dashboard');

  return (
    <main className="container py-6">
      <h1 className="text-2xl font-bold">{t('title', { district: '—' })}</h1>
      <p className="mt-2 text-muted-foreground">{t('noIssues')}</p>
    </main>
  );
}
