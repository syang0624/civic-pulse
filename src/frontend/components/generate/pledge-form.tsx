'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
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

  const labels = currentLocale === 'ko' ? {
    title: '정책 공약 생성',
    subtitle: '지역 이슈를 기반으로 우선순위별 공약을 생성합니다.',
    focusAreas: '중점 분야',
    numPledges: '공약 수',
    regionContext: '추가 지역 맥락',
    regionContextPlaceholder: '지역 특수 상황이나 강조하고 싶은 이슈를 입력하세요...',
    generate: '공약 생성',
    generating: '공약 생성 중...',
    problem: '문제점',
    solution: '해결 방안',
    timeline: '추진 일정',
    outcomes: '기대 효과',
    talkingPoints: '핵심 논점',
    priorityReason: '우선순위 이유',
    budget: '예상 예산',
  } : {
    title: 'Policy Pledge Generator',
    subtitle: 'Generate prioritized campaign pledges based on local issues.',
    focusAreas: 'Focus Areas',
    numPledges: 'Number of Pledges',
    regionContext: 'Additional Regional Context',
    regionContextPlaceholder: 'Enter region-specific context or issues to emphasize...',
    generate: 'Generate Pledges',
    generating: 'Generating pledges...',
    problem: 'Problem',
    solution: 'Solution',
    timeline: 'Timeline',
    outcomes: 'Expected Outcomes',
    talkingPoints: 'Talking Points',
    priorityReason: 'Priority Reason',
    budget: 'Estimated Budget',
  };

  const [loading, setLoading] = useState(false);
  const [focusAreas, setFocusAreas] = useState<IssueCategory[]>(['education', 'housing']);
  const [numPledges, setNumPledges] = useState<3 | 5 | 10>(5);
  const [regionContext, setRegionContext] = useState('');
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
      `${labels.problem}: ${pledge.problem}`,
      `${labels.solution}: ${pledge.solution}`,
      `${labels.timeline}: ${pledge.timeline}`,
      `${labels.outcomes}:`,
      ...pledge.expected_outcomes.map((item) => `- ${item}`),
      `${labels.talkingPoints}:`,
      ...pledge.talking_points.map((item) => `- ${item}`),
      `${labels.priorityReason}: ${pledge.priority_reason}`,
      `${labels.budget}: ${pledge.estimated_budget}`,
    ].join('\n');
  }

  async function handleCopy(pledge: PledgeItem) {
    await navigator.clipboard.writeText(buildPledgeCopyText(pledge));
    setCopiedRank(pledge.rank);
    setTimeout(() => setCopiedRank(null), 2000);
  }

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{labels.title}</h1>
          <p className="text-muted-foreground">{labels.subtitle}</p>
        </div>

        <div className="space-y-3">
          <span className="text-sm font-medium">{labels.focusAreas}</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {ISSUE_CATEGORIES.map((category) => (
              <label key={category} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={focusAreas.includes(category)}
                  onChange={() => toggleCategory(category)}
                  className="accent-primary"
                />
                <span>{CATEGORY_EMOJIS[category]}</span>
                <span>{tc(category)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">{labels.numPledges}</span>
          <div className="flex gap-6">
            {[3, 5, 10].map((count) => (
              <label key={count} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="pledge-count"
                  checked={numPledges === count}
                  onChange={() => setNumPledges(count as 3 | 5 | 10)}
                  className="accent-primary"
                />
                {count}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="pledge-region-context" className="text-sm font-medium">
            {labels.regionContext}
          </label>
          <textarea
            id="pledge-region-context"
            value={regionContext}
            onChange={(e) => setRegionContext(e.target.value)}
            placeholder={labels.regionContextPlaceholder}
            rows={4}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || focusAreas.length === 0}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? labels.generating : labels.generate}
        </button>
      </section>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {pledges.length > 0 && (
        <section className="space-y-4">
          {[...pledges]
            .sort((a, b) => a.rank - b.rank)
            .map((pledge, index) => {
              const color = CATEGORY_COLORS[pledge.category];
              return (
                <details
                  key={`${pledge.rank}-${pledge.title}-${index}`}
                  className="rounded-md border bg-muted/20"
                  open={index === 0}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                        #{pledge.rank}
                      </span>
                      <span className="text-base font-bold">{pledge.title}</span>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${color.bg} ${color.text}`}
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
                      className="text-sm text-primary hover:underline"
                    >
                      {copiedRank === pledge.rank ? tCommon('copiedToClipboard') : tCommon('copy')}
                    </button>
                  </summary>

                  <div className="space-y-4 border-t bg-background px-4 py-4 text-sm">
                    <div>
                      <h3 className="mb-1 font-semibold">{labels.problem}</h3>
                      <p className="whitespace-pre-wrap text-muted-foreground">{pledge.problem}</p>
                    </div>

                    <div>
                      <h3 className="mb-1 font-semibold">{labels.solution}</h3>
                      <p className="whitespace-pre-wrap text-muted-foreground">{pledge.solution}</p>
                    </div>

                    <div>
                      <h3 className="mb-1 font-semibold">{labels.timeline}</h3>
                      <p className="text-muted-foreground">{pledge.timeline}</p>
                    </div>

                    <div>
                      <h3 className="mb-1 font-semibold">{labels.outcomes}</h3>
                      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                        {pledge.expected_outcomes.map((item, i) => (
                          <li key={`${pledge.rank}-outcome-${i}`}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="mb-1 font-semibold">{labels.talkingPoints}</h3>
                      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                        {pledge.talking_points.map((item, i) => (
                          <li key={`${pledge.rank}-talking-${i}`}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="mb-1 font-semibold">{labels.priorityReason}</h3>
                      <p className="text-muted-foreground">{pledge.priority_reason}</p>
                    </div>

                    <div>
                      <h3 className="mb-1 font-semibold">{labels.budget}</h3>
                      <p className="text-muted-foreground">{pledge.estimated_budget}</p>
                    </div>
                  </div>
                </details>
              );
            })}
        </section>
      )}
    </div>
  );
}
