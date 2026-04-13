'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { GeneratingOverlay } from './generating-overlay';
import type { Generation } from '@/shared/types';

interface SentimentOutput {
  period: string;
  top_trending_up: string[];
  top_trending_down: string[];
  new_issues: string[];
  negative_hotspots: string[];
  recommended_actions: string[];
}

interface SentimentResponse extends Generation {
  structured?: SentimentOutput;
  quality?: {
    source_confidence: 'high' | 'medium' | 'low';
    policy_alignment: 'aligned' | 'needs_review';
    strict_factual: boolean;
    notes: string[];
  };
}

type Period = '1week' | '2weeks' | '4weeks' | '8weeks';
type CompareTo = 'none' | 'neighboring';

export function SentimentForm() {
  const t = useTranslations('Generate.Sentiment');
  const tCommon = useTranslations('Common');
  const locale = useLocale();

  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<Period>('4weeks');
  const [compareTo, setCompareTo] = useState<CompareTo>('none');
  const [strictFactual, setStrictFactual] = useState(true);
  const [output, setOutput] = useState<SentimentOutput | null>(null);
  const [qualitySummary, setQualitySummary] = useState<string | null>(null);
  const [qualityNotes, setQualityNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setOutput(null);
    setQualitySummary(null);
    setQualityNotes([]);

    try {
      const res = await fetch('/api/generate/sentiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-locale': locale,
        },
        body: JSON.stringify({
          period,
          compare_to: compareTo,
          strict_factual: strictFactual,
        }),
      });

      const data = (await res.json()) as SentimentResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? tCommon('error'));
      }

      const structured = data.structured
        ? data.structured
        : (() => {
            try {
              return JSON.parse(data.output_text) as SentimentOutput;
            } catch {
              return null;
            }
          })();

      if (!structured) {
        throw new Error(tCommon('error'));
      }

      setOutput(structured);

      if (data.quality) {
        const quality = data.quality;
        const summary = [
          `${t('sourceConfidence')}: ${quality.source_confidence}`,
          `${t('policyAlignment')}: ${quality.policy_alignment}`,
          `${t('strictFactual')}: ${quality.strict_factual ? t('enabled') : t('disabled')}`,
        ].join(' · ');
        setQualitySummary(summary);
        setQualityNotes(quality.notes ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon('error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-10 animate-fade-in">
      <section className="space-y-8 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <label htmlFor="sentiment-period" className="block text-sm font-semibold tracking-wide text-foreground">
              {t('period')}
            </label>
            <select
              id="sentiment-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="w-full appearance-none rounded-xl border bg-background px-4 py-3 text-base shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            >
              <option value="1week">{t('period1week')}</option>
              <option value="2weeks">{t('period2weeks')}</option>
              <option value="4weeks">{t('period4weeks')}</option>
              <option value="8weeks">{t('period8weeks')}</option>
            </select>
          </div>

          <div className="space-y-3">
            <label htmlFor="sentiment-compare" className="block text-sm font-semibold tracking-wide text-foreground">
              {t('compareTo')}
            </label>
            <select
              id="sentiment-compare"
              value={compareTo}
              onChange={(e) => setCompareTo(e.target.value as CompareTo)}
              className="w-full appearance-none rounded-xl border bg-background px-4 py-3 text-base shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            >
              <option value="none">{t('compareNone')}</option>
              <option value="neighboring">{t('compareNeighboring')}</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-3 rounded-xl border bg-background px-4 py-3 text-sm">
          <input
            type="checkbox"
            checked={strictFactual}
            onChange={(e) => setStrictFactual(e.target.checked)}
            className="h-4 w-4"
          />
          <span>{t('strictFactualHint')}</span>
        </label>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="w-full rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? tCommon('loading') : t('generate')}
        </button>
      </section>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-6 py-4 text-sm font-medium text-destructive animate-fade-in">
          {error}
        </div>
      )}

      {output && (
        <section className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm animate-slide-up sm:p-8">
          <div className="border-b pb-4">
            <h3 className="text-lg font-bold">{t('briefTitle', { period: output.period })}</h3>
            {qualitySummary && <p className="mt-2 text-sm text-muted-foreground">{qualitySummary}</p>}
            {qualityNotes.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {qualityNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
          </div>

          <SummaryList title={t('trendingUp')} items={output.top_trending_up} />
          <SummaryList title={t('trendingDown')} items={output.top_trending_down} />
          <SummaryList title={t('newIssues')} items={output.new_issues} />
          <SummaryList title={t('negativeHotspots')} items={output.negative_hotspots} />
          <SummaryList title={t('recommendedActions')} items={output.recommended_actions} />
        </section>
      )}

      <GeneratingOverlay visible={loading} />
    </div>
  );
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-5">
      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-foreground/90">
        {items.length > 0 ? (
          items.map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)
        ) : (
          <li className="text-muted-foreground">-</li>
        )}
      </ul>
    </div>
  );
}
