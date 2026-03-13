'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Newspaper, TrendingUp, AlertTriangle } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_EMOJIS } from '@/shared/constants';
import type { IssueCategory } from '@/shared/types';

interface SummaryData {
  total: number;
  by_urgency: { high: number; medium: number; low: number };
  by_category: { category: IssueCategory; count: number }[];
  by_trend: { rising: number; stable: number; declining: number };
  top_category: IssueCategory | null;
  high_urgency_count: number;
}

export function ExecutiveSummary({ districtCode, districtName }: { districtCode?: string; districtName?: string }) {
  const t = useTranslations();
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const query = districtCode ? `?region_code=${districtCode}` : '';
        const res = await fetch(`/api/issues/summary${query}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error('Failed to fetch summary', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, [districtCode]);

  if (loading) {
    return <SummarySkeleton />;
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="bg-card border-border shadow-sm hover:shadow-md rounded-2xl border p-6 transition-all duration-200">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">{t('Dashboard.summaryTotalIssues')}</p>
            <h3 className="text-foreground mt-2 text-3xl font-bold">{data.total}</h3>
            <p className="text-muted-foreground mt-1 text-xs">{t('Dashboard.summaryLast30Days')}</p>
          </div>
          <div className="bg-primary/10 rounded-full p-2.5">
            <Newspaper className="text-primary h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="bg-card border-border shadow-sm hover:shadow-md rounded-2xl border p-6 transition-all duration-200">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-muted-foreground text-sm font-medium">{t('Dashboard.summaryUrgencyDist')}</p>
          <div className="bg-orange-100 rounded-full p-2.5 dark:bg-orange-900/20">
            <AlertTriangle className="text-orange-600 h-5 w-5 dark:text-orange-400" />
          </div>
        </div>
        <div className="space-y-3">
          <UrgencyBar label={t('Dashboard.urgencyHigh')} count={data.by_urgency.high} color="bg-red-500" total={data.total} />
          <UrgencyBar label={t('Dashboard.urgencyMedium')} count={data.by_urgency.medium} color="bg-yellow-500" total={data.total} />
          <UrgencyBar label={t('Dashboard.urgencyLow')} count={data.by_urgency.low} color="bg-green-500" total={data.total} />
        </div>
      </div>

      <div className="bg-card border-border shadow-sm hover:shadow-md rounded-2xl border p-6 transition-all duration-200">
        <p className="text-muted-foreground mb-4 text-sm font-medium">{t('Dashboard.summaryTopCategories')}</p>
        <div className="space-y-3">
          {data.by_category.slice(0, 3).map((item) => (
            <CategoryRow key={item.category} item={item} total={data.total} />
          ))}
          {data.by_category.length === 0 && (
             <p className="text-muted-foreground py-2 text-sm italic">{t('Dashboard.summaryNoIssues')}</p>
          )}
        </div>
      </div>

      <div className="bg-primary/5 border-primary/10 hover:shadow-md col-span-1 rounded-2xl border p-6 transition-all duration-200 md:col-span-2 lg:col-span-3">
        <div className="flex items-start gap-4">
          <div className="bg-background rounded-full p-2.5 shadow-sm">
            <TrendingUp className="text-primary h-5 w-5" />
          </div>
          <div>
            <h4 className="text-foreground mb-1 text-sm font-semibold">{t('Dashboard.summaryTrending')}</h4>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {data.total > 0
                ? t('Dashboard.summaryTrendText', {
                    district: districtName || t('Profile.districtName'),
                    top_category: data.top_category ? t(`Categories.${data.top_category}`) : '',
                    high_urgency_count: data.high_urgency_count,
                  })
                : t('Dashboard.summaryNoIssues')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UrgencyBar({ label, count, color, total }: { label: string; count: number; color: string; total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-muted-foreground min-w-[3rem] flex-1">{label}</span>
      <span className="text-foreground font-medium">{count}</span>
      <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
        <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function CategoryRow({ item, total }: { item: { category: IssueCategory; count: number }; total: number }) {
  const t = useTranslations();
  const percentage = total > 0 ? (item.count / total) * 100 : 0;
  const color = CATEGORY_COLORS[item.category];
  
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color.bg}`}>
        <span className="text-sm">{CATEGORY_EMOJIS[item.category]}</span>
      </div>
      <div className="flex-1">
        <div className="flex justify-between text-sm">
          <span className="text-foreground font-medium">{t(`Categories.${item.category}`)}</span>
          <span className="text-muted-foreground">{item.count}</span>
        </div>
        <div className="bg-muted mt-1.5 h-1.5 w-full overflow-hidden rounded-full">
          <div className={`h-full ${color.bg.replace('bg-', 'bg-opacity-100 bg-')}`} style={{ width: `${percentage}%`, backgroundColor: color.hex }} />
        </div>
      </div>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-card border-border shadow-sm rounded-2xl border p-6">
          <div className="bg-muted animate-pulse h-4 w-24 rounded mb-4" />
          <div className="bg-muted animate-pulse h-8 w-16 rounded mb-2" />
          <div className="bg-muted animate-pulse h-3 w-32 rounded" />
        </div>
      ))}
      <div className="bg-card border-border shadow-sm col-span-1 rounded-2xl border p-6 md:col-span-2 lg:col-span-3">
        <div className="flex gap-4">
          <div className="bg-muted animate-pulse h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="bg-muted animate-pulse h-4 w-32 rounded" />
            <div className="bg-muted animate-pulse h-4 w-full rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
