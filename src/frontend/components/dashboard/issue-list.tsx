'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import type { Issue, IssueDisplay, PaginatedResponse, Locale } from '@/shared/types';
import { IssueCard } from './issue-card';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export function IssueList({ districtCode }: { districtCode?: string }) {
  const t = useTranslations('Dashboard');
  const tCommon = useTranslations('Common');
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale() as Locale;

  const [data, setData] = useState<PaginatedResponse<Issue> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [autoCrawling, setAutoCrawling] = useState(false);
  const [crawlAttempted, setCrawlAttempted] = useState(false);

  const fetchIssueData = async () => {
    const params = new URLSearchParams(searchParams.toString());
    if (districtCode) {
      params.set('region_code', districtCode);
    }
    const res = await fetch(`/api/issues?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch');
    return await res.json() as PaginatedResponse<Issue>;
  };

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(false);
      try {
        const json = await fetchIssueData();

        if (cancelled) return;

        if (
          json.data.length === 0 &&
          json.pagination.total === 0 &&
          districtCode &&
          !crawlAttempted
        ) {
          setCrawlAttempted(true);
          setAutoCrawling(true);
          setLoading(false);

          try {
            await fetch('/api/issues/crawl', { method: 'POST' });
          } catch {
          }

          if (cancelled) return;

          try {
            const refreshed = await fetchIssueData();
            if (!cancelled) setData(refreshed);
          } catch {
          }

          if (!cancelled) setAutoCrawling(false);
          return;
        }

        setData(json);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => { cancelled = true; };
  }, [searchParams, districtCode]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(pathname + '?' + params.toString());
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-8 text-center text-destructive">
        <p>{tCommon('error')}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 text-sm underline hover:text-destructive/80"
        >
          {tCommon('retry')}
        </button>
      </div>
    );
  }

  if (autoCrawling) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{t('autoCrawling')}</p>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed text-center">
        <p className="text-muted-foreground">{t('noIssues')}</p>
      </div>
    );
  }

  const mapIssueToDisplay = (issue: Issue): IssueDisplay => {
    let sources: import('@/shared/types').IssueSource[] = [];
    if (issue.source_session) {
      try {
        sources = JSON.parse(issue.source_session);
      } catch { /* invalid JSON — keep empty */ }
    }

    return {
      id: issue.id,
      title: locale === 'ko' ? issue.title_ko : (issue.title_en || issue.title_ko),
      category: issue.category,
      subcategory: issue.subcategory,
      description: locale === 'ko' ? issue.description_ko : (issue.description_en || issue.description_ko),
      region_code: issue.region_code,
      sub_region: issue.sub_region,
      sentiment: issue.sentiment,
      urgency: issue.urgency,
      trend: issue.trend,
      mention_count: issue.mention_count,
      first_seen: issue.first_seen,
      last_seen: issue.last_seen,
      translated: locale === 'en' && !!issue.title_en,
      sources,
    };
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.data.map((issue) => (
          <IssueCard key={issue.id} issue={mapIssueToDisplay(issue)} />
        ))}
      </div>

      {data.pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-8 animate-fade-in animation-delay-500">
          <button
            onClick={() => handlePageChange(data.pagination.page - 1)}
            disabled={data.pagination.page <= 1}
            className="rounded-xl border p-3 hover:bg-accent disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <span className="text-sm font-medium text-muted-foreground/80">
            {t('pagination', { page: data.pagination.page, total: data.pagination.total_pages })}
          </span>

          <button
            onClick={() => handlePageChange(data.pagination.page + 1)}
            disabled={data.pagination.page >= data.pagination.total_pages}
            className="rounded-xl border p-3 hover:bg-accent disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
