'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Loader2, Search, LayoutGrid, List } from 'lucide-react';
import type { Generation, GenerationTool, Locale, PaginatedResponse } from '@/shared/types';
import { cn } from '@/frontend/lib/utils';
import { GenerationCard } from './generation-card';
import { GenerationDetail } from './generation-detail';

type Tab = 'all' | GenerationTool;
type Sort = 'newest' | 'oldest';
type ViewMode = 'grid' | 'list';

const tabOrder: Tab[] = ['all', 'speech', 'ad', 'pledge', 'strategy'];

const toolColors: Record<GenerationTool, string> = {
  speech: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  ad: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  pledge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  strategy: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
};

export function WorkspaceContent() {
  const t = useTranslations('Workspace');
  const locale = useLocale() as Locale;

  const [tab, setTab] = useState<Tab>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewMode>('grid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<PaginatedResponse<Generation> | null>(null);
  const [selected, setSelected] = useState<Generation | null>(null);
  const [stats, setStats] = useState<Record<GenerationTool, number>>({
    speech: 0,
    ad: 0,
    pledge: 0,
    strategy: 0,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    async function fetchStats() {
      const tools: GenerationTool[] = ['speech', 'ad', 'pledge', 'strategy'];
      try {
        const promises = tools.map(async (tool) => {
          const params = new URLSearchParams({ tool, limit: '1' });
          const res = await fetch(`/api/generations?${params.toString()}`, {
            headers: { 'x-locale': locale },
          });
          if (!res.ok) return 0;
          const json = await res.json();
          return json.pagination?.total ?? 0;
        });

        const results = await Promise.all(promises);
        const newStats = tools.reduce((acc, tool, index) => {
          acc[tool] = results[index];
          return acc;
        }, {} as Record<GenerationTool, number>);
        
        setStats(newStats);
      } catch (err) {
        console.error('Failed to fetch stats', err);
      }
    }
    fetchStats();
  }, [locale]);

  useEffect(() => {
    async function fetchGenerations() {
      setLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams();
        params.set('sort', sort);
        params.set('page', String(page));
        params.set('limit', '12');
        if (tab !== 'all') {
          params.set('tool', tab);
        }
        if (search) {
          params.set('search', search);
        }

        const res = await fetch(`/api/generations?${params.toString()}`, {
          headers: { 'x-locale': locale },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch generations');
        }

        const json = (await res.json()) as PaginatedResponse<Generation>;
        setResult(json);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchGenerations();
  }, [tab, search, sort, page, locale]);

  async function handleDelete(generation: Generation) {
    if (!window.confirm(t('deleteConfirm'))) {
      return;
    }

    const res = await fetch(`/api/generations/${generation.id}`, { method: 'DELETE' });
    if (!res.ok) {
      return;
    }

    setSelected((current) => (current?.id === generation.id ? null : current));
    setResult((current) => {
      if (!current) return current;
      const data = current.data.filter((item) => item.id !== generation.id);
      const total = Math.max(0, current.pagination.total - 1);
      return {
        data,
        pagination: {
          ...current.pagination,
          total,
          total_pages: Math.max(1, Math.ceil(total / current.pagination.limit)),
        },
      };
    });
    
    setStats(prev => ({
      ...prev,
      [generation.tool]: Math.max(0, prev[generation.tool] - 1)
    }));
  }

  function handleSaved(updated: Generation) {
    setSelected(updated);
    setResult((current) => {
      if (!current) return current;
      return {
        ...current,
        data: current.data.map((item) => (item.id === updated.id ? updated : item)),
      };
    });
  }

  const tabLabels: Record<Tab, string> = {
    all: t('tabs.all'),
    speech: t('tabs.speech'),
    ad: t('tabs.ad'),
    pledge: t('tabs.pledge'),
    strategy: t('tabs.strategy'),
  };

  const totalPages = result?.pagination.total_pages ?? 1;

  const skeletonCards = useMemo(
    () => Array.from({ length: 6 }, (_, index) => index),
    [],
  );

  const groupedGenerations = useMemo(() => {
    if (!result?.data) return {};
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const grouped: Record<string, Generation[]> = {
      dateToday: [],
      dateThisWeek: [],
      dateThisMonth: [],
      dateOlder: [],
    };

    result.data.forEach((item) => {
      const date = new Date(item.created_at);
      const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      if (itemDate.getTime() === today.getTime()) {
        grouped.dateToday.push(item);
      } else if (itemDate >= oneWeekAgo) {
        grouped.dateThisWeek.push(item);
      } else if (itemDate >= thisMonthStart) {
        grouped.dateThisMonth.push(item);
      } else {
        grouped.dateOlder.push(item);
      }
    });

    return grouped;
  }, [result?.data]);

  const groupKeys = ['dateToday', 'dateThisWeek', 'dateThisMonth', 'dateOlder'];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap gap-3 pb-2">
        {(Object.entries(stats) as [GenerationTool, number][]).map(([tool, count]) => (
          <div 
            key={tool} 
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              toolColors[tool]
            )}
          >
            <span>{tabLabels[tool]}</span>
            <span className="font-bold opacity-80">{count}</span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabOrder.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setTab(item);
                  setPage(1);
                }}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-all',
                  tab === item
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                {tabLabels[item]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto]">
          <label className="relative block sm:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t('search')}
              className="w-full rounded-xl border bg-background py-2.5 pl-10 pr-4 text-sm shadow-sm transition-all placeholder:text-muted-foreground/60 hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </label>

          <div className="flex items-center gap-1 rounded-xl border bg-background p-1">
            <button
              type="button"
              onClick={() => setView('grid')}
              className={cn(
                'rounded-lg p-2 transition-all',
                view === 'grid' 
                  ? 'bg-secondary text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              title={t('gridView')}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn(
                'rounded-lg p-2 transition-all',
                view === 'list' 
                  ? 'bg-secondary text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              title={t('listView')}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setSort('newest');
              setPage(1);
            }}
            className={cn(
              'rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
              sort === 'newest' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {t('sortNewest')}
          </button>

          <button
            type="button"
            onClick={() => {
              setSort('oldest');
              setPage(1);
            }}
            className={cn(
              'rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
              sort === 'oldest' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {t('sortOldest')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className={cn("grid gap-4", view === 'grid' ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
          {skeletonCards.map((item) => (
            <div key={item} className={cn("rounded-2xl border bg-card shadow-sm", view === 'grid' ? "p-6" : "p-4 h-20")}>
              <div className="mb-4 h-6 w-24 animate-pulse rounded-full bg-muted" />
              <div className="mb-2 h-6 w-4/5 animate-pulse rounded bg-muted" />
              {view === 'grid' && (
                <>
                  <div className="mb-1 h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="mb-5 h-4 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-16 animate-pulse rounded bg-muted" />
                </>
              )}
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center">
          <p className="text-destructive">Failed to load content.</p>
        </div>
      ) : !result || result.data.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 text-center">
          <Loader2 className="mb-4 h-6 w-6 text-muted-foreground/50" />
          <p className="text-lg font-semibold text-foreground">{t('empty')}</p>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t('emptyHint')}</p>
        </div>
      ) : (
        <>
          <div className="space-y-8">
            {groupKeys.map((key) => {
              const items = groupedGenerations[key];
              if (!items || items.length === 0) return null;

              return (
                <div key={key} className="space-y-4">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">
                    {t(key)}
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-foreground">
                      {items.length}
                    </span>
                  </h2>
                  <div className={cn(
                    "grid gap-4",
                    view === 'grid' ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
                  )}>
                    {items.map((generation) => (
                      <GenerationCard
                        key={generation.id}
                        generation={generation}
                        onOpen={setSelected}
                        onDelete={handleDelete}
                        viewMode={view}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-6">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="rounded-xl border p-3 transition-all hover:bg-accent hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <span className="text-sm font-medium text-muted-foreground/80">
                {t('page', { page, total: totalPages })}
              </span>

              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="rounded-xl border p-3 transition-all hover:bg-accent hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </>
      )}

      {selected && (
        <GenerationDetail
          generation={selected}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
          onSaved={handleSaved}
        />
      )}
    </section>
  );
}
