'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { GeneratingOverlay } from './generating-overlay';
import type { Generation, IssueCategory } from '@/shared/types';
import { ISSUE_CATEGORIES, CATEGORY_COLORS, CATEGORY_EMOJIS } from '@/shared/constants';

interface PledgeItem {
  rank: number;
  title: string;
  category: IssueCategory;
  problem: string;
  solution: string;
  timeline: string;
  expected_outcomes: string[];
  talking_points: string[];
  priority_reason: string;
  estimated_budget: string;
}

export function PledgeForm() {
  const currentLocale = useLocale();
  const tCommon = useTranslations('Common');
  const tc = useTranslations('Categories');
  const t = useTranslations('Generate.Pledge');

  const [loading, setLoading] = useState(false);
  const [focusAreas, setFocusAreas] = useState<IssueCategory[]>(['education', 'housing']);
  const [numPledges, setNumPledges] = useState<3 | 5 | 10>(5);
  const [regionContext, setRegionContext] = useState('');
  const [strictFactual, setStrictFactual] = useState(true);
  const [pledges, setPledges] = useState<PledgeItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedRank, setCopiedRank] = useState<number | null>(null);

  async function handleGenerate() {
    if (focusAreas.length === 0) return;

    setLoading(true);
    setError(null);
    setPledges([]);

    try {
      const res = await fetch('/api/generate/pledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-locale': currentLocale,
        },
        body: JSON.stringify({
          focus_areas: focusAreas,
          num_pledges: numPledges,
          region_context: regionContext.trim() || undefined,
          strict_factual: strictFactual,
        }),
      });

      const data = (await res.json()) as Generation & {
        structured?: PledgeItem[];
        output_text?: string;
        error?: string;
      };

      if (!res.ok) {
        const msg = data?.error ?? tCommon('error');
        throw new Error(
          msg.includes('AI_RATE_LIMIT') ? tCommon('rateLimitError') : msg,
        );
      }

      let parsed: PledgeItem[] = Array.isArray(data.structured) ? data.structured : [];

      if (parsed.length === 0 && data.output_text) {
        try {
          const json = JSON.parse(data.output_text) as unknown;
          if (Array.isArray(json)) parsed = json as PledgeItem[];
        } catch {
          parsed = [];
        }
      }

      setPledges(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon('error'));
    } finally {
      setLoading(false);
    }
  }

  function toggleCategory(category: IssueCategory) {
    setFocusAreas((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  }

  function buildPledgeCopyText(pledge: PledgeItem): string {
    return [
      `#${pledge.rank} ${pledge.title}`,
      `${t('problem')}: ${pledge.problem}`,
      `${t('solution')}: ${pledge.solution}`,
      `${t('timeline')}: ${pledge.timeline}`,
      `${t('outcomes')}:`,
      ...pledge.expected_outcomes.map((item) => `- ${item}`),
      `${t('talkingPoints')}:`,
      ...pledge.talking_points.map((item) => `- ${item}`),
      `${t('priorityReason')}: ${pledge.priority_reason}`,
      `${t('budget')}: ${pledge.estimated_budget}`,
    ].join('\n');
  }

  async function handleCopy(pledge: PledgeItem) {
    await navigator.clipboard.writeText(buildPledgeCopyText(pledge));
    setCopiedRank(pledge.rank);
    setTimeout(() => setCopiedRank(null), 2000);
  }

  return (
    <div className="space-y-10 animate-fade-in">
      <section className="space-y-8 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="space-y-4">
          <span className="block text-sm font-semibold tracking-wide text-foreground">{t('focusAreas')}</span>
          <div className="flex flex-wrap gap-3">
            {ISSUE_CATEGORIES.map((category) => (
              <label 
                key={category} 
                className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-all hover:scale-105 hover:shadow-sm ${
                  focusAreas.includes(category)
                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                    : 'bg-background hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                <input
                  type="checkbox"
                  checked={focusAreas.includes(category)}
                  onChange={() => toggleCategory(category)}
                  className="sr-only"
                />
                <span className="mr-2">{CATEGORY_EMOJIS[category]}</span>
                <span>{tc(category)}</span>
              </label>
            ))}
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

        <div className="space-y-4">
          <span className="block text-sm font-semibold tracking-wide text-foreground">{t('numPledges')}</span>
          <div className="flex gap-3">
            {[3, 5, 10].map((count) => (
              <label 
                key={count} 
                className={`flex min-w-[3rem] cursor-pointer items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition-all hover:border-primary/50 hover:bg-muted/50 ${
                  numPledges === count
                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                    : 'bg-background text-muted-foreground'
                }`}
              >
                <input
                  type="radio"
                  name="pledge-count"
                  checked={numPledges === count}
                  onChange={() => setNumPledges(count as 3 | 5 | 10)}
                  className="sr-only"
                />
                {count}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label htmlFor="pledge-region-context" className="block text-sm font-semibold tracking-wide text-foreground">
            {t('regionContext')}
          </label>
          <textarea
            id="pledge-region-context"
            value={regionContext}
            onChange={(e) => setRegionContext(e.target.value)}
            placeholder={t('regionContextPlaceholder')}
            rows={4}
            className="w-full rounded-xl border bg-background px-4 py-3 text-base shadow-sm transition-all placeholder:text-muted-foreground/50 hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || focusAreas.length === 0}
          className="w-full rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? t('generating') : t('generate')}
        </button>
      </section>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-6 py-4 text-sm font-medium text-destructive animate-fade-in">
          {error}
        </div>
      )}

      {pledges.length > 0 && (
        <section className="space-y-4 animate-slide-up">
          {[...pledges]
            .sort((a, b) => a.rank - b.rank)
            .map((pledge, index) => {
              const color = CATEGORY_COLORS[pledge.category];
              return (
                <details
                  key={`${pledge.rank}-${pledge.title}-${index}`}
                  className="group rounded-2xl border bg-card shadow-sm transition-all hover:shadow-md open:ring-2 open:ring-primary/10"
                  open={index === 0}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 outline-none">
                    <div className="flex flex-1 items-center gap-4">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        #{pledge.rank}
                      </span>
                      <span className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{pledge.title}</span>
                      <span
                        className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border shadow-sm ${color.bg} ${color.text} border-transparent`}
                      >
                        {CATEGORY_EMOJIS[pledge.category]} {tc(pledge.category)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        void handleCopy(pledge);
                      }}
                      className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                    >
                      {copiedRank === pledge.rank ? tCommon('copiedToClipboard') : tCommon('copy')}
                    </button>
                  </summary>

                  <div className="space-y-6 border-t border-border/50 bg-muted/5 px-6 py-6 text-base">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('problem')}</h3>
                        <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{pledge.problem}</p>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('solution')}</h3>
                        <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{pledge.solution}</p>
                      </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-3">
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('timeline')}</h3>
                        <p className="font-medium">{pledge.timeline}</p>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('budget')}</h3>
                        <p className="font-medium">{pledge.estimated_budget}</p>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('priorityReason')}</h3>
                        <p className="text-sm text-muted-foreground">{pledge.priority_reason}</p>
                      </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-3 rounded-xl bg-background p-5 shadow-sm">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('outcomes')}</h3>
                        <ul className="space-y-2">
                          {pledge.expected_outcomes.map((item, i) => (
                            <li key={`${pledge.rank}-outcome-${i}`} className="flex items-start gap-2 text-sm leading-relaxed">
                              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/50" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-3 rounded-xl bg-background p-5 shadow-sm">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('talkingPoints')}</h3>
                        <ul className="space-y-2">
                          {pledge.talking_points.map((item, i) => (
                            <li key={`${pledge.rank}-talking-${i}`} className="flex items-start gap-2 text-sm leading-relaxed">
                              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/50" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </details>
              );
            })}
        </section>
      )}
      <GeneratingOverlay visible={loading} />
    </div>
  );
}
