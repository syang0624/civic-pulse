import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NavBar } from '@/frontend/components/layout/nav-bar';
import { getAuthUser } from '@/backend/lib/auth';
import { createClient } from '@/backend/lib/supabase/server';
import { CATEGORY_COLORS, CATEGORY_EMOJIS } from '@/shared/constants';
import { ArrowLeft, MessageSquare, Mic, Share2, Calendar, MapPin, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { cn } from '@/frontend/lib/utils';
import type { Issue, Locale } from '@/shared/types';

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
  
  const title = locale === 'ko' ? issue.title_ko : (issue.title_en || issue.title_ko);
  const description = locale === 'ko' ? issue.description_ko : (issue.description_en || issue.description_ko);
  
  const color = CATEGORY_COLORS[issue.category];
  const emoji = CATEGORY_EMOJIS[issue.category];

  const TrendIcon = {
    rising: TrendingUp,
    declining: TrendingDown,
    stable: Minus
  }[issue.trend];

  const urgencyColor = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-green-100 text-green-700 border-green-200'
  }[issue.urgency];

  return (
    <main className="container max-w-5xl py-8">
      <Link 
        href={`/${locale}/dashboard`} 
        className="mb-6 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        {tCommon('back')}
      </Link>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium border",
                color.bg, color.text, "border-transparent"
              )}>
                <span>{emoji}</span>
                {tc(issue.category)}
              </span>
              
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium border",
                urgencyColor
              )}>
                <AlertTriangle className="h-3.5 w-3.5" />
                {issue.urgency === 'high' ? t('urgencyHigh') :
                 issue.urgency === 'medium' ? t('urgencyMedium') : t('urgencyLow')}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
                <TrendIcon className={cn(
                  "h-3.5 w-3.5",
                  issue.trend === 'rising' ? "text-red-500" : 
                  issue.trend === 'declining' ? "text-green-500" : "text-gray-500"
                )} />
                {issue.trend === 'rising' ? t('trendRising') :
                 issue.trend === 'declining' ? t('trendDeclining') : t('trendStable')}
              </span>
            </div>

            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
              {title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>{issue.sub_region || issue.region_code}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{new Date(issue.first_seen).toLocaleDateString(locale)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                <span>{t('mentions', { count: issue.mention_count })}</span>
              </div>
            </div>
          </div>

          <div className="prose prose-stone max-w-none dark:prose-invert">
            <h3 className="text-xl font-semibold">{t('description')}</h3>
            <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
              {description}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="mb-4 font-semibold text-lg">{t('writeAbout')}</h3>
            <div className="grid gap-3">
              <Link
                href={`/${locale}/generate/speech?issueId=${issue.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Mic className="h-4 w-4" />
                {t('draftSpeech')}
              </Link>
              
              <Link
                href={`/${locale}/generate/ad?issueId=${issue.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-md border bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
              >
                <Share2 className="h-4 w-4" />
                {t('createPost')}
              </Link>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="mb-4 font-semibold text-lg">{t('publicSentiment')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('publicSentiment')}</span>
                <span className="font-medium">{issue.sentiment ?? 50}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div 
                  className={cn("h-full transition-all", 
                    (issue.sentiment ?? 50) > 60 ? 'bg-green-500' :
                    (issue.sentiment ?? 50) < 40 ? 'bg-red-500' : 'bg-yellow-500'
                  )}
                  style={{ width: `${issue.sentiment ?? 50}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                {t('sentimentNote')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
