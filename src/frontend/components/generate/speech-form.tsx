'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
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

  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [occasion, setOccasion] = useState<SpeechOccasion>('campaign_rally');
  const [tone, setTone] = useState<Tone>('formal');
  const [length, setLength] = useState<SpeechLength>('3min');
  const [dataLevel, setDataLevel] = useState<DataLevel>('medium');
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const occasionLabels: Record<SpeechOccasion, string> = {
    campaign_rally: currentLocale === 'ko' ? '유세 현장' : 'Campaign Rally',
    debate: currentLocale === 'ko' ? '토론회' : 'Debate',
    town_hall: currentLocale === 'ko' ? '주민 간담회' : 'Town Hall',
    press_conference: currentLocale === 'ko' ? '기자 회견' : 'Press Conference',
    online_video: currentLocale === 'ko' ? '온라인 영상' : 'Online Video',
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
        const msg = data?.error ?? tCommon('error');
        throw new Error(
          msg.includes('AI_RATE_LIMIT') ? tCommon('rateLimitError') : msg,
        );
      }

      setOutput((data as Generation).output_text);
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
    <div className="space-y-8">
      <section className="space-y-6">
        {/* Topic */}
        <div className="space-y-2">
          <label htmlFor="speech-topic" className="text-sm font-medium">
            {tg('topicLabel')}
          </label>
          <input
            id="speech-topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={tg('topicPlaceholder')}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Occasion */}
          <div className="space-y-2">
            <label htmlFor="speech-occasion" className="text-sm font-medium">
              {t('occasion')}
            </label>
            <select
              id="speech-occasion"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value as SpeechOccasion)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {OCCASIONS.map((occ) => (
                <option key={occ} value={occ}>
                  {occasionLabels[occ]}
                </option>
              ))}
            </select>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <label htmlFor="speech-tone" className="text-sm font-medium">
              {tProfile('tone')}
            </label>
            <select
              id="speech-tone"
              value={tone}
              onChange={(e) => setTone(e.target.value as Tone)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {TONES.map((tn) => (
                <option key={tn} value={tn}>
                  {toneLabels[tn]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Length */}
        <div className="space-y-2">
          <span className="text-sm font-medium">{t('length')}</span>
          <div className="flex flex-wrap gap-4">
            {LENGTHS.map((len) => (
              <label key={len} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="speech-length"
                  value={len}
                  checked={length === len}
                  onChange={() => setLength(len)}
                  className="accent-primary"
                />
                {lengthLabels[len]}
              </label>
            ))}
          </div>
        </div>

        {/* Data Level */}
        <div className="space-y-2">
          <span className="text-sm font-medium">{t('dataLevel')}</span>
          <div className="flex flex-wrap gap-4">
            {DATA_LEVELS.map((dl) => (
              <label key={dl} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="speech-data-level"
                  value={dl}
                  checked={dataLevel === dl}
                  onChange={() => setDataLevel(dl)}
                  className="accent-primary"
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
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? tCommon('loading') : tg('generate')}
        </button>
      </section>

      {/* Error Message */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Output Display */}
      {output && (
        <section className="space-y-4 rounded-md border bg-muted/30 p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{tCommon('showOriginal')}</h3>
            <button
              type="button"
              onClick={handleCopy}
              className="text-sm text-primary hover:underline"
            >
              {copied ? tCommon('copiedToClipboard') : tCommon('copy')}
            </button>
          </div>
          <div className="whitespace-pre-wrap rounded-md bg-background p-4 text-sm leading-relaxed shadow-sm">
            {output}
          </div>
        </section>
      )}
    </div>
  );
}
