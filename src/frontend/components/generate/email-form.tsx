'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { GeneratingOverlay } from './generating-overlay';
import type { Generation, Tone } from '@/shared/types';

type EmailResponse = Generation & {
  quality?: {
    source_confidence: 'high' | 'medium' | 'low';
    policy_alignment: 'aligned' | 'needs_review';
    strict_factual: boolean;
    notes: string[];
  };
};

const TONES: Tone[] = ['formal', 'conversational', 'passionate', 'data_driven'];

export function EmailForm() {
  const t = useTranslations('Generate.Email');
  const tCommon = useTranslations('Common');
  const tProfile = useTranslations('Profile');
  const locale = useLocale();

  const [loading, setLoading] = useState(false);
  const [inboundEmail, setInboundEmail] = useState('');
  const [tone, setTone] = useState<Tone>('formal');
  const [strictFactual, setStrictFactual] = useState(true);
  const [output, setOutput] = useState<string | null>(null);
  const [qualityNotes, setQualityNotes] = useState<string[]>([]);
  const [qualitySummary, setQualitySummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toneLabels = useMemo<Record<Tone, string>>(
    () => ({
      formal: tProfile('toneFormal'),
      conversational: tProfile('toneConversational'),
      passionate: tProfile('tonePassionate'),
      data_driven: tProfile('toneDataDriven'),
    }),
    [tProfile],
  );

  async function handleGenerate() {
    if (!inboundEmail.trim()) return;

    setLoading(true);
    setError(null);
    setOutput(null);
    setQualityNotes([]);
    setQualitySummary(null);

    try {
      const res = await fetch('/api/generate/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-locale': locale,
        },
        body: JSON.stringify({
          inbound_email: inboundEmail,
          tone,
          strict_factual: strictFactual,
        }),
      });

      const data = (await res.json()) as EmailResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? tCommon('error'));
      }

      setOutput(data.output_text);

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

  async function handleCopy() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-10 animate-fade-in">
      <section className="space-y-8 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="space-y-4">
          <label htmlFor="email-inbound" className="block text-sm font-semibold tracking-wide text-foreground">
            {t('inboundEmail')}
          </label>
          <textarea
            id="email-inbound"
            value={inboundEmail}
            onChange={(e) => setInboundEmail(e.target.value)}
            rows={10}
            placeholder={t('inboundPlaceholder')}
            className="w-full rounded-xl border bg-background px-4 py-3 text-base leading-relaxed shadow-sm transition-all placeholder:text-muted-foreground/50 hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <label htmlFor="email-tone" className="block text-sm font-semibold tracking-wide text-foreground">
              {tProfile('tone')}
            </label>
            <select
              id="email-tone"
              value={tone}
              onChange={(e) => setTone(e.target.value as Tone)}
              className="w-full appearance-none rounded-xl border bg-background px-4 py-3 text-base shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            >
              {TONES.map((toneValue) => (
                <option key={toneValue} value={toneValue}>
                  {toneLabels[toneValue]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <span className="block text-sm font-semibold tracking-wide text-foreground">{t('strictFactual')}</span>
            <label className="flex items-center gap-3 rounded-xl border bg-background px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={strictFactual}
                onChange={(e) => setStrictFactual(e.target.checked)}
                className="h-4 w-4"
              />
              <span>{t('strictFactualHint')}</span>
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !inboundEmail.trim()}
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
        <section className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm animate-slide-up sm:p-8">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="text-lg font-bold">{t('replyDraft')}</h3>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-full bg-muted/50 px-4 py-1.5 text-sm font-medium text-foreground transition-all hover:bg-primary hover:text-primary-foreground"
            >
              {copied ? tCommon('copiedToClipboard') : tCommon('copy')}
            </button>
          </div>
          {qualitySummary && (
            <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{qualitySummary}</p>
              {qualityNotes.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {qualityNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="prose prose-stone max-w-none whitespace-pre-wrap rounded-xl bg-muted/30 p-6 text-base leading-loose text-foreground/90 dark:prose-invert">
            {output}
          </div>
        </section>
      )}

      <GeneratingOverlay visible={loading} />
    </div>
  );
}
