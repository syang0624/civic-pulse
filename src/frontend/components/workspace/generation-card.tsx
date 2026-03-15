'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Calendar, Eye, Trash2 } from 'lucide-react';
import type { Generation, GenerationTool } from '@/shared/types';
import { cn } from '@/frontend/lib/utils';

interface GenerationCardProps {
  generation: Generation;
  onOpen: (generation: Generation) => void;
  onDelete: (generation: Generation) => void;
  viewMode?: 'grid' | 'list';
}

const toolBadgeStyle: Record<GenerationTool, string> = {
  speech: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  ad: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  pledge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  strategy: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
};

const toolBorderColor: Record<GenerationTool, string> = {
  speech: 'border-l-blue-500',
  ad: 'border-l-emerald-500',
  pledge: 'border-l-amber-500',
  strategy: 'border-l-purple-500',
};

function readString(
  params: Record<string, unknown>,
  key: string,
): string | null {
  const value = params[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function readNumber(
  params: Record<string, unknown>,
  key: string,
): number | null {
  const value = params[key];
  return typeof value === 'number' ? value : null;
}

function readStringArray(
  params: Record<string, unknown>,
  key: string,
): string[] {
  const value = params[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

function toolLabel(tool: GenerationTool, t: ReturnType<typeof useTranslations<'Workspace'>>) {
  if (tool === 'speech') return t('tabs.speech');
  if (tool === 'ad') return t('tabs.ad');
  if (tool === 'strategy') return t('tabs.strategy');
  return t('tabs.pledge');
}

export function GenerationCard({ generation, onOpen, onDelete, viewMode = 'grid' }: GenerationCardProps) {
  const t = useTranslations('Workspace');
  const content = generation.edited_text?.trim() || generation.output_text;

  const meta = useMemo(() => {
    const params = generation.input_params;
    const topic = readString(params, 'topic');
    const title = topic ?? `${toolLabel(generation.tool, t)} #${generation.id.slice(0, 6)}`;

    if (generation.tool === 'speech') {
      return {
        title,
        lines: [
          `${t('occasion')}: ${readString(params, 'occasion') ?? '-'}`,
          `Length: ${readString(params, 'length') ?? '-'}`,
        ],
      };
    }

    if (generation.tool === 'ad') {
      return {
        title,
        lines: [
          `${t('platform')}: ${readString(params, 'platform') ?? '-'}`,
          `${t('goal')}: ${readString(params, 'goal') ?? '-'}`,
        ],
      };
    }

    if (generation.tool === 'strategy') {
      const issueTitle = readString(params, 'issue_title') ?? readString(params, 'topic');
      return {
        title: issueTitle ?? title,
        lines: [
          `Issue: ${issueTitle ?? '-'}`,
          `Focus: ${readString(params, 'focus') ?? '-'}`,
        ],
      };
    }

    const focusAreas = readStringArray(params, 'focus_areas');
    const numPledges = readNumber(params, 'num_pledges');
    return {
      title: title === `${toolLabel(generation.tool, t)} #${generation.id.slice(0, 6)}`
        ? focusAreas.join(', ') || title
        : title,
      lines: [
        `${t('focusAreas')}: ${focusAreas.length > 0 ? focusAreas.join(', ') : '-'}`,
        `${t('tabs.pledge')}: ${numPledges ?? '-'}`,
      ],
    };
  }, [generation, t]);

  const dateLabel = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(generation.created_at));

  const handleOpen = () => onOpen(generation);

  if (viewMode === 'list') {
    return (
      <article
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleOpen();
          }
        }}
        className={cn(
          'group flex items-center gap-4 rounded-xl border bg-card p-3 shadow-sm transition-all hover:bg-accent/5 border-l-[3px]',
          toolBorderColor[generation.tool],
        )}
      >
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold',
            toolBadgeStyle[generation.tool],
          )}
        >
          {toolLabel(generation.tool, t)}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-foreground">
            {meta.title}
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            {meta.lines.join(' · ')}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
          <span className="hidden sm:inline-block">{dateLabel}</span>
          
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpen(generation);
              }}
              className="rounded-lg p-2 hover:bg-secondary hover:text-foreground"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(generation);
              }}
              className="rounded-lg p-2 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpen();
        }
      }}
      className={cn(
        'group flex flex-col justify-between rounded-2xl border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20 border-l-[3px]',
        toolBorderColor[generation.tool],
      )}
    >
      <div>
        <div className="mb-3 flex items-start justify-between gap-3">
          <span
            className={cn(
              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
              toolBadgeStyle[generation.tool],
            )}
          >
            {toolLabel(generation.tool, t)}
          </span>
          <span className="rounded-full border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {generation.locale.toUpperCase()}
          </span>
        </div>

        <h3 className="mb-2 line-clamp-2 text-lg font-bold leading-tight text-foreground group-hover:text-primary transition-colors">
          {meta.title}
        </h3>

        <div className="mb-4 space-y-1 text-xs text-muted-foreground">
          {meta.lines.map((line) => (
            <p key={line} className="line-clamp-1">{line}</p>
          ))}
        </div>

        <p className="mb-5 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {content}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-border/40 pt-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {dateLabel}
        </span>
        <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(generation);
            }}
            className="rounded-md p-1.5 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(generation);
            }}
            className="rounded-md bg-secondary p-1.5 text-secondary-foreground hover:bg-secondary/80"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
