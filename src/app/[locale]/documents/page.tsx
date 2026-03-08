import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { NavBar } from '@/frontend/components/layout/nav-bar';
import { DocumentForm } from '@/frontend/components/documents/document-form';

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <NavBar />
      <DocumentsContent />
    </>
  );
}

function DocumentsContent() {
  const t = useTranslations('Documents');

  return (
    <main className="container py-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      <div className="mt-6">
        <DocumentForm />
      </div>
    </main>
  );
}
