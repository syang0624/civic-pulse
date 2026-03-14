import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { NavBar } from '@/frontend/components/layout/nav-bar';
import { getAuthUser } from '@/backend/lib/auth';
import { createClient } from '@/backend/lib/supabase/server';
import { IssueFilters } from '@/frontend/components/dashboard/issue-filters';
import { IssueList } from '@/frontend/components/dashboard/issue-list';
import { RefreshIssuesButton } from '@/frontend/components/dashboard/refresh-issues-button';
import { ExecutiveSummary } from '@/frontend/components/dashboard/executive-summary';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getAuthUser();
  let districtName = '';
  let districtCode = '';

  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('profiles')
      .select('district_name, district_code')
      .eq('id', user.id)
      .single();
    if (data?.district_name) {
      districtName = data.district_name;
    }
    if (data?.district_code) {
      districtCode = data.district_code;
    }
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl space-y-10 px-4 py-10">
        <DashboardHeader districtName={districtName} districtCode={districtCode} />
        <ExecutiveSummary districtCode={districtCode} districtName={districtName} />
        <div className="space-y-6">
          <IssueFilters />
          <IssueList districtCode={districtCode} />
        </div>
      </main>
    </>
  );
}

function DashboardHeader({ districtName, districtCode }: { districtName: string; districtCode: string }) {
  const t = useTranslations('Dashboard');
  
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
          {districtName
            ? t('title', { district: districtName })
            : t('titleGeneral')}
        </h1>
        <p className="text-lg text-muted-foreground/80 max-w-2xl leading-relaxed">
          {t('subtitle')}
        </p>
      </div>
      <RefreshIssuesButton districtCode={districtCode} />
    </div>
  );
}
