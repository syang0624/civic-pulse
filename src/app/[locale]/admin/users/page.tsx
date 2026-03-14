import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { NavBar } from '@/frontend/components/layout/nav-bar';
import { getAdminUser } from '@/backend/lib/admin-auth';
import { UserList } from '@/frontend/components/admin/user-list';

export default async function AdminUsersPage({
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
      <main className="mx-auto max-w-7xl space-y-10 px-4 py-10">
        <UsersHeader />
        <UserList />
      </main>
    </>
  );
}

function UsersHeader() {
  const t = useTranslations('Admin');

  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {t('users')}
      </h1>
      <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground/80">
        {t('subtitle')}
      </p>
    </div>
  );
}
