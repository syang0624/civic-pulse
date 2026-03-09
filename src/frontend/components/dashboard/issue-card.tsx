'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@/frontend/lib/utils';
import { CATEGORY_COLORS, CATEGORY_EMOJIS } from '@/shared/constants';
import type { IssueDisplay } from '@/shared/types';
import { 
  MessageSquare, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle 
} from 'lucide-react';

interface IssueCardProps {
  issue: IssueDisplay;
}

export function IssueCard({ issue }: IssueCardProps) {
  const t = useTranslations('Dashboard');
  const tc = useTranslations('Categories');
  
  const color = CATEGORY_COLORS[issue.category];
  const emoji = CATEGORY_EMOJIS[issue.category];

  const TrendIcon = {
    rising: TrendingUp,
    declining: TrendingDown,
    stable: Minus
  }[issue.trend];

  const urgencyColor = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-green-100 text-green-700 border-green-200'
  }[issue.urgency];

  const sentimentPercent = issue.sentiment ?? 50; 
  let sentimentColor = 'bg-gray-300';
  if (sentimentPercent > 60) sentimentColor = 'bg-green-500';
  else if (sentimentPercent < 40) sentimentColor = 'bg-red-500';
  else sentimentColor = 'bg-yellow-500';

  return (
    <Link 
      href={`/dashboard/${issue.id}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <span 
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border",
                color.bg, color.text, "border-transparent"
              )}
            >
              <span>{emoji}</span>
              {tc(issue.category)}
            </span>
            
            <span className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border",
              urgencyColor
            )}>
              <AlertTriangle className="h-3 w-3" />
              {issue.urgency === 'high' ? t('urgencyHigh') :
               issue.urgency === 'medium' ? t('urgencyMedium') : t('urgencyLow')}
            </span>
          </div>

          <h3 className="line-clamp-2 text-lg font-semibold leading-snug group-hover:text-primary">
            {issue.title}
          </h3>

          {issue.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {issue.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5" title={t('filterByTrend')}>
              <TrendIcon className={cn(
                "h-4 w-4",
                issue.trend === 'rising' ? "text-red-500" : 
                issue.trend === 'declining' ? "text-green-500" : "text-gray-500"
              )} />
              <span className="text-xs font-medium uppercase tracking-wider">
                {issue.trend === 'rising' ? t('trendRising') :
                 issue.trend === 'declining' ? t('trendDeclining') : t('trendStable')}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="text-xs">{t('mentions', { count: issue.mention_count })}</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">
            <span>{t('filterBySentiment')}</span>
            <span>{sentimentPercent}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div 
              className={cn("h-full transition-all", sentimentColor)} 
              style={{ width: `${sentimentPercent}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
