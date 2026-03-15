import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { NavBar } from '@/frontend/components/layout/nav-bar';
import { getAdminUser } from '@/backend/lib/admin-auth';
import { AdminPanel } from '@/frontend/components/admin/admin-panel';

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const adminUser = await getAdminUser();
  if (!adminUser) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl space-y-10 px-4 py-10">
        <AdminPanel />
      </main>
    </>
  );
}
