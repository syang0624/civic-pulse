'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import type { AdPlatform, AdGoal, Generation } from '@/shared/types';
import { PLATFORM_CHAR_LIMITS } from '@/shared/constants';

interface SocialMediaOutput {
  title: string;
  content: string;
  hashtags: string[];
  image_suggestions: string[];
}

interface AdGenerationResponse extends Generation {
  structured?: SocialMediaOutput;
}

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

  const searchParams = useSearchParams();
  const issueId = searchParams.get('issueId');

  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState<AdPlatform>('instagram');
  const [topic, setTopic] = useState('');
  const [goal, setGoal] = useState<AdGoal>('awareness');
  const [output, setOutput] = useState<string | null>(null);
  const [structuredOutput, setStructuredOutput] =
    useState<SocialMediaOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  useEffect(() => {
    if (!issueId) return;
    fetch(`/api/issues/${issueId}`)
      .then((res) => res.json())
      .then((data: { title_ko?: string; title_en?: string }) => {
        const title = currentLocale === 'ko'
          ? data.title_ko
          : (data.title_en || data.title_ko);
        if (title) setTopic(title);
      })
      .catch(() => {});
  }, [issueId, currentLocale]);

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
    setStructuredOutput(null);

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

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.error ?? tCommon('error');
        throw new Error(
          msg.includes('AI_RATE_LIMIT') ? tCommon('rateLimitError') : msg,
        );
      }

      const apiData = data as AdGenerationResponse;
      const outputData = apiData.structured || (() => {
        try {
          return JSON.parse(apiData.output_text) as SocialMediaOutput;
        } catch {
          return {
            title: '',
            content: apiData.output_text,
            hashtags: [],
            image_suggestions: [],
          };
        }
      })();

      setStructuredOutput(outputData);
      setOutput(outputData.content);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : tCommon('error'),
      );
    } finally {
      setLoading(false);
    }
  }

  function copyText(section: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  }

  function buildCombinedOutput(data: SocialMediaOutput): string {
    const hashtags = data.hashtags.map((tag) => `#${tag}`).join(' ');
    const imageSuggestions = data.image_suggestions
      .map((item, idx) => `${idx + 1}. ${item}`)
      .join('\n');

    return [
      `${t('sectionTitle')}\n${data.title}`,
      `${t('sectionContent')}\n${data.content}`,
      `${t('sectionHashtags')}\n${hashtags}`,
      `${t('sectionImageSuggestions')}\n${imageSuggestions}`,
    ].join('\n\n');
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

      {structuredOutput && (
        <section className="space-y-4 rounded-md border bg-muted/30 p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{tCommon('showOriginal')}</h3>
            <div className="flex items-center gap-4">
              <span className={`text-sm ${charCount > charLimit ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>
                {t('charCount', { count: charCount, limit: charLimit })}
              </span>
              <button
                type="button"
                onClick={() =>
                  copyText('all', buildCombinedOutput(structuredOutput))
                }
                className="text-sm text-primary hover:underline"
              >
                {copiedSection === 'all'
                  ? tCommon('copiedToClipboard')
                  : tCommon('copy')}
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-md bg-background p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-muted-foreground">{t('sectionTitle')}</h4>
              <button
                type="button"
                onClick={() => copyText('title', structuredOutput.title)}
                className="text-xs text-primary hover:underline"
              >
                {copiedSection === 'title' ? tCommon('copiedToClipboard') : tCommon('copy')}
              </button>
            </div>
            <p className="text-2xl font-bold leading-tight">{structuredOutput.title || '-'}</p>
          </div>

          <div className="space-y-3 rounded-md bg-background p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-muted-foreground">{t('sectionContent')}</h4>
              <button
                type="button"
                onClick={() => copyText('content', structuredOutput.content)}
                className="text-xs text-primary hover:underline"
              >
                {copiedSection === 'content' ? tCommon('copiedToClipboard') : tCommon('copy')}
              </button>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{structuredOutput.content || '-'}</p>
          </div>

          <div className="space-y-3 rounded-md bg-background p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-muted-foreground">{t('sectionHashtags')}</h4>
              <button
                type="button"
                onClick={() =>
                  copyText(
                    'hashtags',
                    structuredOutput.hashtags.map((tag) => `#${tag}`).join(' '),
                  )
                }
                className="text-xs text-primary hover:underline"
              >
                {copiedSection === 'hashtags' ? tCommon('copiedToClipboard') : tCommon('copy')}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {structuredOutput.hashtags.length > 0 ? (
                structuredOutput.hashtags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => copyText(`hashtag-${tag}`, `#${tag}`)}
                    className="rounded-full border bg-muted px-3 py-1 text-xs font-medium text-foreground hover:bg-muted/70"
                  >
                    #{tag}
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-md bg-background p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-muted-foreground">{t('sectionImageSuggestions')}</h4>
              <button
                type="button"
                onClick={() =>
                  copyText(
                    'images',
                    structuredOutput.image_suggestions.join('\n'),
                  )
                }
                className="text-xs text-primary hover:underline"
              >
                {copiedSection === 'images' ? tCommon('copiedToClipboard') : tCommon('copy')}
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {structuredOutput.image_suggestions.length > 0 ? (
                structuredOutput.image_suggestions.map((suggestion, idx) => (
                  <div
                    key={`${suggestion}-${idx}`}
                    className="rounded-md border bg-muted/20 p-3 text-sm leading-relaxed"
                  >
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">{idx + 1}</p>
                    <p>{suggestion}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
