import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { NavBar } from '@/frontend/components/layout/nav-bar';
import { SpeechForm } from '@/frontend/components/generate/speech-form';

export default async function SpeechPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <NavBar />
      <SpeechContent />
    </>
  );
}

function SpeechContent() {
  const t = useTranslations('Generate.Speech');

  return (
    <main className="container max-w-2xl py-6">
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>
      <SpeechForm />
    </main>
  );
}
