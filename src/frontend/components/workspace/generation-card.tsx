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
}

const toolBadgeStyle: Record<GenerationTool, string> = {
  speech: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  ad: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  pledge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  strategy: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
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

export function GenerationCard({ generation, onOpen, onDelete }: GenerationCardProps) {
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
      className="group rounded-2xl border bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-2">
          <span
            className={cn(
              'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
              toolBadgeStyle[generation.tool],
            )}
          >
            {toolLabel(generation.tool, t)}
          </span>
          <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-foreground">
            {meta.title}
          </h3>
        </div>
        <span className="rounded-full border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {generation.locale.toUpperCase()}
        </span>
      </div>

      <div className="mb-4 space-y-1 text-sm text-muted-foreground">
        {meta.lines.map((line) => (
          <p key={line} className="line-clamp-1">{line}</p>
        ))}
      </div>

      <p className="mb-5 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
        {content.slice(0, 150)}
        {content.length > 150 ? '…' : ''}
      </p>

      <div className="flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {t('createdAt')} {dateLabel}
        </span>
        <div className="flex items-center gap-2">
          {generation.user_edited && (
            <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
              {t('editedBadge')}
            </span>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(generation);
            }}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(generation);
            }}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <Eye className="h-3.5 w-3.5" />
            {t('detail')}
          </button>
        </div>
      </div>
    </article>
  );
}
