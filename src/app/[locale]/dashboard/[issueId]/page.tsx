import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NavBar } from '@/frontend/components/layout/nav-bar';
import { getAuthUser } from '@/backend/lib/auth';
import { createClient } from '@/backend/lib/supabase/server';
import { CATEGORY_COLORS } from '@/shared/constants';
import {
  ArrowLeft,
  Mic,
  Share2,
  Calendar,
  MapPin,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Newspaper,
} from 'lucide-react';
import { cn } from '@/frontend/lib/utils';
import type { Issue, IssueSource, Locale } from '@/shared/types';

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ locale: string; issueId: string }>;
}) {
  const { locale, issueId } = await params;
  setRequestLocale(locale);

  const user = await getAuthUser();
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Unauthorized</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: issue } = await supabase
    .from('issues')
    .select('*')
    .eq('id', issueId)
    .single();

  if (!issue) {
    notFound();
  }

  return (
    <>
      <NavBar />
      <IssueDetailContent issue={issue as Issue} locale={locale as Locale} />
    </>
  );
}

function IssueDetailContent({ issue, locale }: { issue: Issue; locale: string }) {
  const t = useTranslations('Dashboard');
  const tc = useTranslations('Categories');
  const tCommon = useTranslations('Common');

  const title =
    locale === 'ko' ? issue.title_ko : issue.title_en || issue.title_ko;
  const description =
    locale === 'ko'
      ? issue.description_ko
      : issue.description_en || issue.description_ko;

  const color = CATEGORY_COLORS[issue.category];

  const TrendIcon = {
    rising: TrendingUp,
    declining: TrendingDown,
    stable: Minus,
  }[issue.trend];

  const urgencyDot = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  }[issue.urgency];

  let sources: IssueSource[] = [];
  if (issue.source_session) {
    try {
      sources = JSON.parse(issue.source_session);
    } catch { /* malformed JSON */ }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href={`/${locale}/dashboard`}
        className="mb-8 inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        {tCommon('back')}
      </Link>

      <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium',
                  color.bg,
                  color.text,
                )}
              >
                {tc(issue.category)}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className={cn(
                    'inline-block h-2 w-2 rounded-full',
                    urgencyDot,
                  )}
                />
                {issue.urgency === 'high'
                  ? t('urgencyHigh')
                  : issue.urgency === 'medium'
                    ? t('urgencyMedium')
                    : t('urgencyLow')}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <TrendIcon
                  className={cn(
                    'h-4 w-4',
                    issue.trend === 'rising'
                      ? 'text-red-500'
                      : issue.trend === 'declining'
                        ? 'text-green-500'
                        : 'text-muted-foreground',
                  )}
                />
                {issue.trend === 'rising'
                  ? t('trendRising')
                  : issue.trend === 'declining'
                    ? t('trendDeclining')
                    : t('trendStable')}
              </span>
            </div>

            <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              {title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {issue.sub_region || issue.region_code}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {new Date(issue.first_seen).toLocaleDateString(locale, {
                  dateStyle: 'long',
                })}
              </span>
              <span>{t('mentions', { count: issue.mention_count })}</span>
            </div>
          </div>

          {description && (
            <div className="rounded-lg border bg-card p-6">
              <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                {description}
              </p>
            </div>
          )}

          {sources.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">
                  {t('sources')} ({sources.length})
                </h3>
              </div>
              <div className="space-y-2">
                {sources.map((source, i) => (
                  <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
                  >
                    <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="font-medium leading-snug text-foreground">
                        {source.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {source.name}
                        {source.published_at &&
                          ` · ${new Date(source.published_at).toLocaleDateString(locale)}`}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('sourcesMethodology')}
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold">{t('writeAbout')}</h3>
            <div className="grid gap-3">
              <Link
                href={`/${locale}/generate/speech?issueId=${issue.id}`}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Mic className="h-4 w-4" />
                {t('draftSpeech')}
              </Link>
              <Link
                href={`/${locale}/generate/ad?issueId=${issue.id}`}
                className="flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                <Share2 className="h-4 w-4" />
                {t('createPost')}
              </Link>
            </div>
          </div>


        </aside>
      </div>
    </main>
  );
}
