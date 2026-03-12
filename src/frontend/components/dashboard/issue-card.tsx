'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { cn } from '@/frontend/lib/utils';
import { CATEGORY_COLORS } from '@/shared/constants';
import type { IssueDisplay } from '@/shared/types';
import { TrendingUp, TrendingDown, Minus, Newspaper } from 'lucide-react';

interface IssueCardProps {
  issue: IssueDisplay;
  index?: number;
}

export function IssueCard({ issue, index = 0 }: IssueCardProps) {
  const t = useTranslations('Dashboard');
  const tc = useTranslations('Categories');

  const color = CATEGORY_COLORS[issue.category];

  const TrendIcon = {
    rising: TrendingUp,
    declining: TrendingDown,
    stable: Minus,
  }[issue.trend];

  const urgencyDot = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  }[issue.urgency];

  const primarySource = issue.sources[0];

  return (
    <Link
      href={`/dashboard/${issue.id}`}
      style={{ animationDelay: `${index * 60}ms` }}
      className="group flex flex-col rounded-xl border bg-card opacity-0 animate-fade-in transition-shadow duration-200 hover:shadow-md overflow-hidden"
    >
      <div className="relative h-[120px] w-full shrink-0">
        <Image
          src={`/images/categories/${issue.category}.jpg`}
          alt={tc(issue.category)}
          width={800}
          height={400}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      <div className="flex flex-1 flex-col justify-between p-5">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs">
          <span
            className={cn(
              'rounded-md px-2 py-0.5 font-medium',
              color.bg,
              color.text,
            )}
          >
            {tc(issue.category)}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className={cn('inline-block h-1.5 w-1.5 rounded-full', urgencyDot)} />
            {issue.urgency === 'high'
              ? t('urgencyHigh')
              : issue.urgency === 'medium'
                ? t('urgencyMedium')
                : t('urgencyLow')}
          </span>
        </div>

        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
          {issue.title}
        </h3>

        {issue.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {issue.description}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <TrendIcon
              className={cn(
                'h-3.5 w-3.5',
                issue.trend === 'rising'
                  ? 'text-red-500'
                  : issue.trend === 'declining'
                    ? 'text-green-500'
                    : 'text-muted-foreground',
              )}
            />
            {issue.trend === 'rising'
              ? t('trendRising')
              : issue.trend === 'declining'
                ? t('trendDeclining')
                : t('trendStable')}
          </span>
          <span>{t('mentions', { count: issue.mention_count })}</span>
        </div>

        {primarySource && (
          <span className="flex items-center gap-1 truncate max-w-[120px]">
            <Newspaper className="h-3 w-3 shrink-0" />
            {primarySource.name}
          </span>
        )}
      </div>
      </div>
    </Link>
  );
}
