import { setRequestLocale } from 'next-intl/server';
import { NavBar } from '@/frontend/components/layout/nav-bar';

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ locale: string; issueId: string }>;
}) {
  const { locale, issueId } = await params;
  setRequestLocale(locale);

  return (
    <>
      <NavBar />
      <main className="container py-6">
        <h1 className="text-2xl font-bold">Issue Detail</h1>
        <p className="mt-2 text-muted-foreground">Issue ID: {issueId}</p>
      </main>
    </>
  );
}
