'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Tone, Generation } from '@/shared/types';

const TONES: Tone[] = ['formal', 'conversational', 'passionate', 'data_driven'];

export function EmailForm() {
  const t = useTranslations('Generate.Email');
  const tg = useTranslations('Generate');
  const tCommon = useTranslations('Common');
  const tProfile = useTranslations('Profile');
  const currentLocale = useLocale();

  const [loading, setLoading] = useState(false);
  const [inboundEmail, setInboundEmail] = useState('');
  const [tone, setTone] = useState<Tone>('formal');
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toneLabels: Record<Tone, string> = {
    formal: tProfile('toneFormal'),
    conversational: tProfile('toneConversational'),
    passionate: tProfile('tonePassionate'),
    data_driven: tProfile('toneDataDriven'),
  };

  async function handleGenerate() {
    if (!inboundEmail.trim()) return;

    setLoading(true);
    setError(null);
    setOutput(null);

    try {
      const res = await fetch('/api/generate/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-locale': currentLocale,
        },
        body: JSON.stringify({
          inbound_email: inboundEmail,
          tone,
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
        <div className="space-y-2">
          <label htmlFor="email-inbound" className="text-sm font-medium">
            {t('inboundEmail')}
          </label>
          <textarea
            id="email-inbound"
            value={inboundEmail}
            onChange={(e) => setInboundEmail(e.target.value)}
            placeholder={t('inboundPlaceholder')}
            className="min-h-[150px] w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email-tone" className="text-sm font-medium">
            {tProfile('tone')}
          </label>
          <select
            id="email-tone"
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

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !inboundEmail.trim()}
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
