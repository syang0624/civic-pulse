'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { GeneratingOverlay } from './generating-overlay';
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

const PLATFORM_LABEL_KEYS: Record<AdPlatform, string> = {
  instagram: 'platformInstagram',
  facebook: 'platformFacebook',
  x: 'platformX',
  kakaostory: 'platformKakaoStory',
  blog_naver: 'platformNaverBlog',
};

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
    <div className="space-y-10 animate-fade-in">
      <section className="space-y-8 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <label htmlFor="ad-platform" className="block text-sm font-semibold tracking-wide text-foreground">
              {t('platform')}
            </label>
            <div className="relative">
              <select
                id="ad-platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as AdPlatform)}
                className="w-full appearance-none rounded-xl border bg-background px-4 py-3 text-base shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {t(PLATFORM_LABEL_KEYS[p])}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label htmlFor="ad-goal" className="block text-sm font-semibold tracking-wide text-foreground">
              {t('goal')}
            </label>
            <div className="relative">
              <select
                id="ad-goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value as AdGoal)}
                className="w-full appearance-none rounded-xl border bg-background px-4 py-3 text-base shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              >
                {GOALS.map((g) => (
                  <option key={g} value={g}>
                    {goalLabels[g]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label htmlFor="ad-topic" className="block text-sm font-semibold tracking-wide text-foreground">
            {tg('topicLabel')}
          </label>
          <input
            id="ad-topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={tg('topicPlaceholder')}
            className="w-full rounded-xl border bg-background px-4 py-3 text-base shadow-sm transition-all placeholder:text-muted-foreground/50 hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !topic.trim()}
          className="w-full rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? tCommon('loading') : tg('generate')}
        </button>
      </section>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-6 py-4 text-sm font-medium text-destructive animate-fade-in">
          {error}
        </div>
      )}

      {structuredOutput && (
        <section className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm animate-slide-up sm:p-8">
          <div className="flex items-center justify-between border-b pb-4 border-border/50">
            <h3 className="text-xl font-bold tracking-tight">{tCommon('showOriginal')}</h3>
            <div className="flex items-center gap-4">
              <span className={`text-sm font-medium ${charCount > charLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                {t('charCount', { count: charCount, limit: charLimit })}
              </span>
              <button
                type="button"
                onClick={() =>
                  copyText('all', buildCombinedOutput(structuredOutput))
                }
                className="rounded-full bg-muted/50 px-4 py-1.5 text-sm font-medium text-foreground transition-all hover:bg-primary hover:text-primary-foreground"
              >
                {copiedSection === 'all'
                  ? tCommon('copiedToClipboard')
                  : tCommon('copy')}
              </button>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="group relative rounded-xl border bg-muted/30 p-5 transition-all hover:bg-muted/50 hover:shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('sectionTitle')}</h4>
                <button
                  type="button"
                  onClick={() => copyText('title', structuredOutput.title)}
                  className="opacity-0 transition-opacity group-hover:opacity-100 text-xs font-medium text-primary hover:underline"
                >
                  {copiedSection === 'title' ? tCommon('copiedToClipboard') : tCommon('copy')}
                </button>
              </div>
              <p className="text-xl font-bold leading-tight text-foreground">{structuredOutput.title || '-'}</p>
            </div>

            <div className="group relative rounded-xl border bg-muted/30 p-5 transition-all hover:bg-muted/50 hover:shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('sectionContent')}</h4>
                <button
                  type="button"
                  onClick={() => copyText('content', structuredOutput.content)}
                  className="opacity-0 transition-opacity group-hover:opacity-100 text-xs font-medium text-primary hover:underline"
                >
                  {copiedSection === 'content' ? tCommon('copiedToClipboard') : tCommon('copy')}
                </button>
              </div>
              <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">{structuredOutput.content || '-'}</p>
            </div>

            <div className="group relative rounded-xl border bg-muted/30 p-5 transition-all hover:bg-muted/50 hover:shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('sectionHashtags')}</h4>
                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      'hashtags',
                      structuredOutput.hashtags.map((tag) => `#${tag}`).join(' '),
                    )
                  }
                  className="opacity-0 transition-opacity group-hover:opacity-100 text-xs font-medium text-primary hover:underline"
                >
                  {copiedSection === 'hashtags' ? tCommon('copiedToClipboard') : tCommon('copy')}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {structuredOutput.hashtags.length > 0 ? (
                  structuredOutput.hashtags.map((tag, i) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => copyText(`hashtag-${tag}`, `#${tag}`)}
                      style={{ animationDelay: `${i * 50}ms` }}
                      className="animate-fade-in rounded-full border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-all hover:scale-105 hover:bg-primary/5 hover:border-primary/30"
                    >
                      #{tag}
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">-</p>
                )}
              </div>
            </div>

            <div className="group relative rounded-xl border bg-muted/30 p-5 transition-all hover:bg-muted/50 hover:shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('sectionImageSuggestions')}</h4>
                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      'images',
                      structuredOutput.image_suggestions.join('\n'),
                    )
                  }
                  className="opacity-0 transition-opacity group-hover:opacity-100 text-xs font-medium text-primary hover:underline"
                >
                  {copiedSection === 'images' ? tCommon('copiedToClipboard') : tCommon('copy')}
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {structuredOutput.image_suggestions.length > 0 ? (
                  structuredOutput.image_suggestions.map((suggestion, idx) => (
                    <div
                      key={`${suggestion}-${idx}`}
                      style={{ animationDelay: `${idx * 100}ms` }}
                      className="animate-fade-in flex flex-col gap-2 rounded-lg border bg-background p-4 shadow-sm transition-all hover:shadow-md"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {idx + 1}
                      </span>
                      <p className="text-sm leading-relaxed text-foreground/90">{suggestion}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">-</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
      <GeneratingOverlay visible={loading} />
    </div>
  );
}
