import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { NavBar } from '@/frontend/components/layout/nav-bar';
import { getAuthUser } from '@/backend/lib/auth';
import { WorkspaceContent } from '@/frontend/components/workspace/workspace-content';

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getAuthUser();

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl space-y-10 px-4 py-10">
        <WorkspaceHeader hasUser={Boolean(user)} />
        <WorkspaceContent />
      </main>
    </>
  );
}

function WorkspaceHeader({ hasUser }: { hasUser: boolean }) {
  const t = useTranslations('Workspace');

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {t('title')}
      </h1>
      <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground/80">
        {hasUser ? t('subtitle') : t('emptyHint')}
      </p>
    </div>
  );
}
