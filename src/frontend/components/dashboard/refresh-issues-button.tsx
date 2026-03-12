'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

export function RefreshIssuesButton() {
  const router = useRouter();
  const t = useTranslations('Dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(`${t('crawlError')} ${message}`);
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
        <span>{loading ? t('crawling') : t('refreshIssues')}</span>
      </button>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
