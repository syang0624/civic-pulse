'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import type { Generation, GenerationTool, Locale, PaginatedResponse } from '@/shared/types';
import { cn } from '@/frontend/lib/utils';
import { GenerationCard } from './generation-card';
import { GenerationDetail } from './generation-detail';

type Tab = 'all' | GenerationTool;
type Sort = 'newest' | 'oldest';

const tabOrder: Tab[] = ['all', 'speech', 'ad', 'pledge'];

export function WorkspaceContent() {
  const t = useTranslations('Workspace');
  const locale = useLocale() as Locale;

  const [tab, setTab] = useState<Tab>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<PaginatedResponse<Generation> | null>(null);
  const [selected, setSelected] = useState<Generation | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

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
  };

  const totalPages = result?.pagination.total_pages ?? 1;
  const totalCount = result?.pagination.total ?? 0;

  const skeletonCards = useMemo(
    () => Array.from({ length: 6 }, (_, index) => index),
    [],
  );

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap gap-2">
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

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t('search')}
              className="w-full rounded-xl border bg-background py-2.5 pl-10 pr-4 text-sm shadow-sm transition-all placeholder:text-muted-foreground/60 hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </label>

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

        <p className="mt-4 text-sm text-muted-foreground">
          {t('totalItems', { count: totalCount })}
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {skeletonCards.map((item) => (
            <div key={item} className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-4 h-6 w-24 animate-pulse rounded-full bg-muted" />
              <div className="mb-2 h-6 w-4/5 animate-pulse rounded bg-muted" />
              <div className="mb-1 h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="mb-5 h-4 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-16 animate-pulse rounded bg-muted" />
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.data.map((generation) => (
              <GenerationCard
                key={generation.id}
                generation={generation}
                onOpen={setSelected}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-2">
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
