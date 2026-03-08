'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Loader2, MapPin, PenTool } from 'lucide-react';
import type { Issue, IssueCategory, Urgency, RegionCode } from '@/shared/types';
import {
  REGIONS,
  ISSUE_CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_EMOJIS,
} from '@/shared/constants';

export function IssueMap() {
  const t = useTranslations('Map');
  const tCat = useTranslations('Categories');
  const tReg = useTranslations('Regions');
  const tCommon = useTranslations('Common');

  const [region, setRegion] = useState<RegionCode | ''>('');
  const [category, setCategory] = useState<IssueCategory | ''>('');
  const [urgency, setUrgency] = useState<Urgency | ''>('');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (region) params.set('region', region);
    if (category) params.set('category', category);
    if (urgency) params.set('urgency', urgency);

    try {
      const res = await fetch(`/api/issues/by-region?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setIssues(json.data ?? []);
      } else {
        const json = await res.json();
        setError(json.error ?? tCommon('error'));
      }
    } catch {
      setError(tCommon('error'));
    } finally {
      setLoading(false);
    }
  }, [region, category, urgency, tCommon]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <label
            htmlFor="region-select"
            className="text-xs font-medium text-muted-foreground"
          >
            {t('regionLabel')}
          </label>
          <select
            id="region-select"
            value={region}
            onChange={(e) => setRegion(e.target.value as RegionCode | '')}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">{t('allRegions')}</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {tReg(r)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="category-select"
            className="text-xs font-medium text-muted-foreground"
          >
            {t('filterCategory')}
          </label>
          <select
            id="category-select"
            value={category}
            onChange={(e) => setCategory(e.target.value as IssueCategory | '')}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">{t('allCategories')}</option>
            {ISSUE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_EMOJIS[cat]} {tCat(cat)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="urgency-select"
            className="text-xs font-medium text-muted-foreground"
          >
            {t('filterUrgency')}
          </label>
          <select
            id="urgency-select"
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as Urgency | '')}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">{t('allUrgency')}</option>
            <option value="high">{t('urgencyHigh')}</option>
            <option value="medium">{t('urgencyMedium')}</option>
            <option value="low">{t('urgencyLow')}</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {!region && !loading && issues.length === 0 && (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {REGIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRegion(r)}
              className="flex items-center gap-3 rounded-md border p-4 text-left transition-colors hover:bg-accent"
            >
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{tReg(r)}</span>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">{tCommon('loading')}</p>
        </div>
      )}

      {!loading && issues.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t('issueCount', { count: issues.length })}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {!loading && issues.length === 0 && (region || category || urgency) && (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-16">
          <MapPin className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-center text-muted-foreground">{t('noIssues')}</p>
        </div>
      )}
    </div>
  );
}

function IssueCard({ issue }: { issue: Issue }) {
  const t = useTranslations('Map');
  const tCat = useTranslations('Categories');
  const tReg = useTranslations('Regions');

  const title = issue.title_ko;
  const description = issue.description_ko;
  const colors = CATEGORY_COLORS[issue.category];
  const regionLabel = REGIONS.includes(issue.region_code as RegionCode)
    ? tReg(issue.region_code as RegionCode)
    : issue.region_code;

  return (
    <div className="flex flex-col rounded-md border p-4 transition-colors hover:bg-accent/50">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
          >
            {CATEGORY_EMOJIS[issue.category]} {tCat(issue.category)}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              issue.urgency === 'high'
                ? 'bg-red-100 text-red-800'
                : issue.urgency === 'medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
            }`}
          >
            {issue.urgency}
          </span>
        </div>
      </div>

      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      {description && (
        <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
          {description}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {regionLabel}
          {issue.sub_region && ` · ${issue.sub_region}`}
        </div>
        <span>{t('mentions', { count: issue.mention_count })}</span>
      </div>

      <div className="mt-3 flex gap-2">
        <Link
          href={`/dashboard/${issue.id}`}
          className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors hover:bg-accent"
        >
          {t('viewDetails')}
        </Link>
        <Link
          href={`/generate/speech?issue=${issue.id}`}
          className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors hover:bg-accent"
        >
          <PenTool className="h-3 w-3" />
          {t('writeAbout')}
        </Link>
      </div>
    </div>
  );
}
