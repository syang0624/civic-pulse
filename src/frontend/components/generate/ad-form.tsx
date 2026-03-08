'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { AdPlatform, AdGoal, Generation } from '@/shared/types';
import { PLATFORM_CHAR_LIMITS } from '@/shared/constants';

const PLATFORMS: AdPlatform[] = [
  'instagram',
  'facebook',
  'x',
  'kakaostory',
  'blog_naver',
];

const GOALS: AdGoal[] = [
  'awareness',
  'event_promotion',
  'position_statement',
  'call_to_action',
];

export function AdForm() {
  const t = useTranslations('Generate.Ad');
  const tg = useTranslations('Generate');
  const tCommon = useTranslations('Common');
  const currentLocale = useLocale();

  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState<AdPlatform>('instagram');
  const [topic, setTopic] = useState('');
  const [goal, setGoal] = useState<AdGoal>('awareness');
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const goalLabels: Record<AdGoal, string> = {
    awareness: t('goalAwareness'),
    event_promotion: t('goalEvent'),
    position_statement: t('goalPosition'),
    call_to_action: t('goalCTA'),
  };

  async function handleGenerate() {
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);
    setOutput(null);

    try {
      const res = await fetch('/api/generate/ad', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-locale': currentLocale,
        },
        body: JSON.stringify({
          platform,
          topic,
          goal,
        }),
      });

      if (!res.ok) {
        throw new Error(tCommon('error'));
      }

      const data: Generation = await res.json();
      setOutput(data.output_text);
    } catch {
      setError(tCommon('error'));
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const charCount = output ? output.length : 0;
  const charLimit = PLATFORM_CHAR_LIMITS[platform];

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="ad-platform" className="text-sm font-medium">
              {t('platform')}
            </label>
            <select
              id="ad-platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as AdPlatform)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="ad-goal" className="text-sm font-medium">
              {t('goal')}
            </label>
            <select
              id="ad-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value as AdGoal)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {GOALS.map((g) => (
                <option key={g} value={g}>
                  {goalLabels[g]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="ad-topic" className="text-sm font-medium">
            {tg('topicLabel')}
          </label>
          <input
            id="ad-topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={tg('topicPlaceholder')}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !topic.trim()}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? tCommon('loading') : tg('generate')}
        </button>
      </section>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {output && (
        <section className="space-y-4 rounded-md border bg-muted/30 p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{tCommon('showOriginal')}</h3>
            <div className="flex items-center gap-4">
              <span className={`text-sm ${charCount > charLimit ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>
                {t('charCount', { count: charCount, limit: charLimit })}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-sm text-primary hover:underline"
              >
                {copied ? tCommon('copiedToClipboard') : tCommon('copy')}
              </button>
            </div>
          </div>
          <div className="whitespace-pre-wrap rounded-md bg-background p-4 text-sm leading-relaxed shadow-sm">
            {output}
          </div>
        </section>
      )}
    </div>
  );
}
