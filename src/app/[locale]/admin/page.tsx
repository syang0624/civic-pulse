import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { NavBar } from '@/frontend/components/layout/nav-bar';
import { getAdminUser } from '@/backend/lib/admin-auth';
import { AdminDashboard } from '@/frontend/components/admin/admin-dashboard';

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
        <AdminHeader />
        <AdminDashboard />
      </main>
    </>
  );
}

function AdminHeader() {
  const t = useTranslations('Admin');

  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {t('title')}
      </h1>
      <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground/80">
        {t('subtitle')}
      </p>
    </div>
  );
}
