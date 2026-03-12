'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ISSUE_CATEGORIES } from '@/shared/constants';
import { Filter, X, ArrowDownWideNarrow } from 'lucide-react';
import { useCallback } from 'react';

export function IssueFilters() {
  const t = useTranslations('Dashboard');
  const tc = useTranslations('Categories');
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      params.set('page', '1');
      return params.toString();
    },
    [searchParams]
  );

  const updateFilter = (name: string, value: string) => {
    router.push(pathname + '?' + createQueryString(name, value));
  };

  const currentCategory = searchParams.get('category') || '';
  const currentUrgency = searchParams.get('urgency') || '';
  const currentTrend = searchParams.get('trend') || '';
  const currentSort = searchParams.get('sort') || 'recent';

  const hasActiveFilters = currentCategory || currentUrgency || currentTrend;

  const clearFilters = () => {
    router.push(pathname);
  };

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <Filter className="h-4 w-4" />
          {t('filter')}
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="group flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
          >
            <X className="h-3 w-3 transition-transform group-hover:rotate-90" />
            {t('clearFilters')}
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative group">
          <select
            value={currentCategory}
            onChange={(e) => updateFilter('category', e.target.value)}
            className="w-full appearance-none rounded-xl border bg-background px-4 py-3 pr-8 text-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">{t('filterByCategory')}</option>
            {ISSUE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {tc(cat)}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-50">
            <ArrowDownWideNarrow className="h-4 w-4" />
          </div>
        </div>

        <div className="relative group">
          <select
            value={currentUrgency}
            onChange={(e) => updateFilter('urgency', e.target.value)}
            className="w-full appearance-none rounded-xl border bg-background px-4 py-3 pr-8 text-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">{t('filterByUrgency')}</option>
            <option value="high">{t('urgencyHigh')}</option>
            <option value="medium">{t('urgencyMedium')}</option>
            <option value="low">{t('urgencyLow')}</option>
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-50">
            <ArrowDownWideNarrow className="h-4 w-4" />
          </div>
        </div>

        <div className="relative group">
          <select
            value={currentTrend}
            onChange={(e) => updateFilter('trend', e.target.value)}
            className="w-full appearance-none rounded-xl border bg-background px-4 py-3 pr-8 text-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">{t('filterByTrend')}</option>
            <option value="rising">{t('trendRising')}</option>
            <option value="stable">{t('trendStable')}</option>
            <option value="declining">{t('trendDeclining')}</option>
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-50">
            <ArrowDownWideNarrow className="h-4 w-4" />
          </div>
        </div>

        <div className="relative group">
          <select
            value={currentSort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className="w-full appearance-none rounded-xl border bg-background px-4 py-3 pr-8 text-sm font-medium transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="recent">{t('sortRecent')}</option>
            <option value="mentions">{t('sortMentions')}</option>
            <option value="urgency">{t('sortUrgency')}</option>
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-50">
            <ArrowDownWideNarrow className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
