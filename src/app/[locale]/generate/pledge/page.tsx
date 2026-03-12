import { setRequestLocale } from 'next-intl/server';
import { NavBar } from '@/frontend/components/layout/nav-bar';
import { PledgeForm } from '@/frontend/components/generate/pledge-form';

export default async function PledgePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <PledgeForm />
      </main>
    </>
  );
}
