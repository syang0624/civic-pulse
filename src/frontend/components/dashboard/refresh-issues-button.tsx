'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import type { Locale } from '@/shared/types';
import { Loader2 } from 'lucide-react';

export function RefreshIssuesButton() {
  const router = useRouter();
  const locale = useLocale() as Locale;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labels = {
    idle: locale === 'ko' ? '이슈 새로고침' : 'Refresh Issues',
    loading: locale === 'ko' ? '이슈 수집 중...' : 'Crawling issues...',
    errorPrefix: locale === 'ko' ? '이슈 수집 실패:' : 'Failed to crawl issues:',
  };

  async function handleRefreshIssues() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/issues/crawl', { method: 'POST' });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? 'Request failed');
      }
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`${labels.errorPrefix} ${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleRefreshIssues}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        <span>{loading ? labels.loading : labels.idle}</span>
      </button>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
