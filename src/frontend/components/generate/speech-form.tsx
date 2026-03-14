'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Monitor } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type {
  SpeechOccasion,
  SpeechLength,
  DataLevel,
  Tone,
  Generation,
} from '@/shared/types';

const OCCASIONS: SpeechOccasion[] = [
  'campaign_rally',
  'debate',
  'town_hall',
  'press_conference',
  'online_video',
];

const LENGTHS: SpeechLength[] = ['3min', '5min', '10min'];
const DATA_LEVELS: DataLevel[] = ['light', 'medium', 'heavy'];
const TONES: Tone[] = ['formal', 'conversational', 'passionate', 'data_driven'];

export function SpeechForm() {
  const t = useTranslations('Generate.Speech');
  const tg = useTranslations('Generate');
  const tCommon = useTranslations('Common');
  const tProfile = useTranslations('Profile'); // For tone labels
  const currentLocale = useLocale();

  const searchParams = useSearchParams();
  const issueId = searchParams.get('issueId');

  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [occasion, setOccasion] = useState<SpeechOccasion>('campaign_rally');
  const [tone, setTone] = useState<Tone>('formal');
  const [length, setLength] = useState<SpeechLength>('3min');
  const [dataLevel, setDataLevel] = useState<DataLevel>('medium');
  const [output, setOutput] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const occasionLabels: Record<SpeechOccasion, string> = {
    campaign_rally: t('occasionRally'),
    debate: t('occasionDebate'),
    town_hall: t('occasionTownHall'),
    press_conference: t('occasionPressConference'),
    online_video: t('occasionOnline'),
  };

  const lengthLabels: Record<SpeechLength, string> = {
    '3min': t('length3min'),
    '5min': t('length5min'),
    '10min': t('length10min'),
  };

  const dataLevelLabels: Record<DataLevel, string> = {
    light: t('dataLight'),
    medium: t('dataMedium'),
    heavy: t('dataHeavy'),
  };

  const toneLabels: Record<Tone, string> = {
    formal: tProfile('toneFormal'),
    conversational: tProfile('toneConversational'),
    passionate: tProfile('tonePassionate'),
    data_driven: tProfile('toneDataDriven'),
  };

  async function handleGenerate() {
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);
    setOutput(null);

    try {
      const res = await fetch('/api/generate/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-locale': currentLocale,
        },
        body: JSON.stringify({
          topic,
          occasion,
          tone,
          length,
          data_level: dataLevel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = (data as { error?: string })?.error ?? tCommon('error');
        throw new Error(
          msg.includes('AI_RATE_LIMIT') ? tCommon('rateLimitError') : msg,
        );
      }

      const generation = data as Generation;

      setOutput(generation.output_text);
      setGenerationId(generation.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : tCommon('error'),
      );
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

  return (
    <div className="space-y-10 animate-fade-in">
      <section className="space-y-8 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="space-y-4">
          <label htmlFor="speech-topic" className="block text-sm font-semibold tracking-wide text-foreground">
            {tg('topicLabel')}
          </label>
          <input
            id="speech-topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={tg('topicPlaceholder')}
            className="w-full rounded-xl border bg-background px-4 py-3 text-base shadow-sm transition-all placeholder:text-muted-foreground/50 hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Occasion */}
          <div className="space-y-3">
            <label htmlFor="speech-occasion" className="block text-sm font-semibold tracking-wide text-foreground">
              {t('occasion')}
            </label>
            <div className="relative">
              <select
                id="speech-occasion"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value as SpeechOccasion)}
                className="w-full appearance-none rounded-xl border bg-background px-4 py-3 text-base shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              >
                {OCCASIONS.map((occ) => (
                  <option key={occ} value={occ}>
                    {occasionLabels[occ]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tone */}
          <div className="space-y-3">
            <label htmlFor="speech-tone" className="block text-sm font-semibold tracking-wide text-foreground">
              {tProfile('tone')}
            </label>
            <div className="relative">
              <select
                id="speech-tone"
                value={tone}
                onChange={(e) => setTone(e.target.value as Tone)}
                className="w-full appearance-none rounded-xl border bg-background px-4 py-3 text-base shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              >
                {TONES.map((tn) => (
                  <option key={tn} value={tn}>
                    {toneLabels[tn]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Length */}
        <div className="space-y-3">
          <span className="block text-sm font-semibold tracking-wide text-foreground">{t('length')}</span>
          <div className="flex flex-wrap gap-3">
            {LENGTHS.map((len) => (
              <label 
                key={len} 
                className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-all hover:border-primary/50 hover:bg-muted/50 ${
                  length === len 
                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20' 
                    : 'bg-background text-muted-foreground'
                }`}
              >
                <input
                  type="radio"
                  name="speech-length"
                  value={len}
                  checked={length === len}
                  onChange={() => setLength(len)}
                  className="sr-only"
                />
                {lengthLabels[len]}
              </label>
            ))}
          </div>
        </div>

        {/* Data Level */}
        <div className="space-y-3">
          <span className="block text-sm font-semibold tracking-wide text-foreground">{t('dataLevel')}</span>
          <div className="flex flex-wrap gap-3">
            {DATA_LEVELS.map((dl) => (
              <label 
                key={dl} 
                className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-all hover:border-primary/50 hover:bg-muted/50 ${
                  dataLevel === dl 
                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20' 
                    : 'bg-background text-muted-foreground'
                }`}
              >
                <input
                  type="radio"
                  name="speech-data-level"
                  value={dl}
                  checked={dataLevel === dl}
                  onChange={() => setDataLevel(dl)}
                  className="sr-only"
                />
                {dataLevelLabels[dl]}
              </label>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !topic.trim()}
          className="w-full rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? tCommon('loading') : tg('generate')}
        </button>
      </section>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-6 py-4 text-sm font-medium text-destructive animate-fade-in">
          {error}
        </div>
      )}

      {/* Output Display */}
      {output && (
        <section className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm animate-slide-up sm:p-8">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="text-lg font-bold">{tCommon('showOriginal')}</h3>
            <div className="flex items-center gap-2">
              {generationId && (
                <Link
                  href={`/teleprompter/${generationId}`}
                  className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary transition-all hover:bg-primary/20"
                >
                  <Monitor className="h-4 w-4" />
                  {t('openTeleprompter')}
                </Link>
              )}
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-full bg-muted/50 px-4 py-1.5 text-sm font-medium text-foreground transition-all hover:bg-primary hover:text-primary-foreground"
              >
                {copied ? tCommon('copiedToClipboard') : tCommon('copy')}
              </button>
            </div>
          </div>
          <div className="prose prose-stone max-w-none whitespace-pre-wrap rounded-xl bg-muted/30 p-6 text-base leading-loose text-foreground/90 dark:prose-invert">
            {output}
          </div>
        </section>
      )}
    </div>
  );
}
