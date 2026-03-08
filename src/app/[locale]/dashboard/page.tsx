import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { NavBar } from '@/frontend/components/layout/nav-bar';
import { getAuthUser } from '@/backend/lib/auth';
import { createClient } from '@/backend/lib/supabase/server';
import { IssueFilters } from '@/frontend/components/dashboard/issue-filters';
import { IssueList } from '@/frontend/components/dashboard/issue-list';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getAuthUser();
  let districtName = '—';

  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('profiles')
      .select('district_name')
      .eq('id', user.id)
      .single();
    if (data?.district_name) {
      districtName = data.district_name;
    }
  }

  return (
    <>
      <NavBar />
      <main className="container max-w-7xl space-y-8 py-8">
        <DashboardHeader districtName={districtName} />
        
        <div className="space-y-6">
          <IssueFilters />
          <IssueList />
        </div>
      </main>
    </>
  );
}

function DashboardHeader({ districtName }: { districtName: string }) {
  const t = useTranslations('Dashboard');
  
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl font-bold tracking-tight">
        {t('title', { district: districtName })}
      </h1>
      <p className="text-muted-foreground">
        {t('subtitle')}
      </p>
    </div>
  );
}
