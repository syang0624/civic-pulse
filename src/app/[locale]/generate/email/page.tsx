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
    <main className="container max-w-2xl py-6">
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>
      <EmailForm />
    </main>
  );
}
