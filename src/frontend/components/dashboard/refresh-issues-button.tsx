'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, RefreshCw } from 'lucide-react';
import { CrawlProgressOverlay } from '@/frontend/components/dashboard/crawl-progress-overlay';
import type { Locale } from '@/shared/types';

interface IssuesResponse {
  data: Array<{ last_seen: string }>;
}

function formatRelativeTime(lastSeen: string, locale: Locale): string {
  const then = new Date(lastSeen).getTime();
  if (!Number.isFinite(then)) {
    return '-';
  }

  const now = Date.now();
  const diffSeconds = Math.round((then - now) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (absSeconds < 60) {
    return rtf.format(diffSeconds, 'second');
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, 'day');
}

export function RefreshIssuesButton({ districtCode }: { districtCode?: string }) {
  const router = useRouter();
  const locale = useLocale() as Locale;
  const t = useTranslations('Dashboard');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'info' } | null>(null);
  const [lastUpdatedText, setLastUpdatedText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLastUpdated() {
      try {
        const params = new URLSearchParams({ sort: 'recent', page: '1', limit: '1' });
        if (districtCode) {
          params.set('region_code', districtCode);
        }

        const response = await fetch(`/api/issues?${params.toString()}`);
        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as IssuesResponse;
        const lastSeen = result.data?.[0]?.last_seen;

        if (!cancelled) {
          setLastUpdatedText(lastSeen ? formatRelativeTime(lastSeen, locale) : null);
        }
      } catch {
        if (!cancelled) {
          setLastUpdatedText(null);
        }
      }
    }

    fetchLastUpdated();

    return () => {
      cancelled = true;
    };
  }, [districtCode, locale, loading]);

  async function handleRefreshIssues() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/issues/crawl?force=true', { method: 'POST' });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? 'Request failed');
      }

      router.refresh();
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Unknown error';
      setMessage({ text: `${t('crawlError')} ${text}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <CrawlProgressOverlay isActive={loading} />
      
      <button
        type="button"
        onClick={handleRefreshIssues}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        {loading ? t('crawling') : t('refreshIssues')}
      </button>

      {message && (
        <p
          className={`text-xs ${message.type === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}
        >
          {message.text}
        </p>
      )}

      <div className="text-right text-xs text-muted-foreground">
        <p>{t('autoUpdateEnabled')}</p>
        {lastUpdatedText && <p>{t('lastUpdated', { time: lastUpdatedText })}</p>}
      </div>
    </div>
  );
}
