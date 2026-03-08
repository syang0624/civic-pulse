'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { Generation, PaginatedResponse, GenerationTool } from '@/shared/types';

export function HistoryList() {
  const t = useTranslations('Generate.History');
  const tNav = useTranslations('Nav');
  const tCommon = useTranslations('Common');

  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toolFilter, setToolFilter] = useState<GenerationTool | 'all'>('all');

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/generate/history');
        if (!res.ok) throw new Error(tCommon('error'));
        const data: PaginatedResponse<Generation> = await res.json();
        setGenerations(data.data);
      } catch {
        setError(tCommon('error'));
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [tCommon]);

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id);
  }

  const filteredGenerations =
    toolFilter === 'all'
      ? generations
      : generations.filter((g) => g.tool === toolFilter);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground">{tCommon('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setToolFilter('all')}
          className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            toolFilter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          {t('viewAll')}
        </button>
        {(['speech', 'email', 'ad', 'qa', 'sentiment'] as const).map((tool) => (
          <button
            key={tool}
            onClick={() => setToolFilter(tool)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              toolFilter === tool
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tNav(tool)}
          </button>
        ))}
      </div>

      {filteredGenerations.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center">
          <p className="text-muted-foreground">{t('noHistory')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredGenerations.map((gen) => (
            <div key={gen.id} className="rounded-md border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {tNav(gen.tool)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t('generatedAt', {
                      date: new Date(gen.created_at).toLocaleDateString(),
                    })}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(gen.output_text, gen.id)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {copiedId === gen.id
                    ? tCommon('copiedToClipboard')
                    : tCommon('copy')}
                </button>
              </div>

              <div className="text-sm leading-relaxed">
                {expandedId === gen.id ? (
                  <div className="whitespace-pre-wrap">{gen.output_text}</div>
                ) : (
                  <div className="line-clamp-3 whitespace-pre-wrap">
                    {gen.output_text}
                  </div>
                )}
              </div>

              <button
                onClick={() => toggleExpand(gen.id)}
                className="mt-2 text-xs font-medium text-primary hover:underline"
              >
                {expandedId === gen.id ? t('collapse') : t('expand')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
