import { setRequestLocale } from 'next-intl/server';
import { NavBar } from '@/frontend/components/layout/nav-bar';

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
      <main className="container py-6">
        <h1 className="text-2xl font-bold">Issue Map</h1>
        <p className="mt-2 text-muted-foreground">Coming soon — Tier 2</p>
      </main>
    </>
  );
}
