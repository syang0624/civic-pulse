import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { NavBar } from '@/frontend/components/layout/nav-bar';
import { IssueMap } from '@/frontend/components/map/issue-map';

export default async function MapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <NavBar />
      <MapContent />
    </>
  );
}

function MapContent() {
  const t = useTranslations('Map');

  return (
    <main className="container py-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      <div className="mt-6">
        <IssueMap />
      </div>
    </main>
  );
}
