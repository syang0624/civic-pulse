'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, RefreshCw } from 'lucide-react';
import { CrawlProgressOverlay } from '@/frontend/components/dashboard/crawl-progress-overlay';

export function RefreshIssuesButton() {
  const router = useRouter();
  const t = useTranslations('Dashboard');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'info' } | null>(null);

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
    </div>
  );
}
