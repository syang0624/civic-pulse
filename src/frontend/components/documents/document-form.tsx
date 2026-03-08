'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, Copy, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import type { DocumentSummarizeResponse } from '@/shared/types';

export function DocumentForm() {
  const t = useTranslations('Documents');
  const tCommon = useTranslations('Common');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const [summaries, setSummaries] = useState<DocumentSummarizeResponse[]>([]);
  const [activeSummaryIndex, setActiveSummaryIndex] = useState<number | null>(
    null,
  );

  async function handleSummarize() {
    if (content.length < 100) {
      setFeedback({ type: 'error', message: t('errorTooShort') });
      return;
    }

    setSummarizing(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/documents/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'Untitled Document',
          content,
        }),
      });

      if (res.ok) {
        const data: DocumentSummarizeResponse = await res.json();
        setSummaries((prev) => [data, ...prev]);
        setActiveSummaryIndex(0);
        setTitle('');
        setContent('');
      } else {
        const data = await res.json();
        setFeedback({
          type: 'error',
          message: data.error ?? t('errorFailed'),
        });
      }
    } catch {
      setFeedback({ type: 'error', message: t('errorFailed') });
    } finally {
      setSummarizing(false);
    }
  }

  function handleCopySummary() {
    if (activeSummaryIndex === null) return;
    const summary = summaries[activeSummaryIndex].summary;
    const text = [
      `${t('oneLine')}: ${summary.one_line}`,
      '',
      `${t('keyChanges')}:`,
      ...summary.key_changes.map((c) => `  - ${c}`),
      '',
      `${t('whoAffected')}:`,
      ...summary.who_affected.map((a) => `  - ${a}`),
      '',
      `${t('timeline')}: ${summary.timeline}`,
      '',
      `${t('yourDistrict')}: ${summary.district_impact}`,
      '',
      `${t('talkingPoints')}:`,
      ...summary.talking_points.map((tp) => `  - ${tp}`),
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClear() {
    setTitle('');
    setContent('');
    setFeedback(null);
  }

  function handleDeleteSummary(index: number) {
    setSummaries((prev) => prev.filter((_, i) => i !== index));
    if (activeSummaryIndex === index) {
      setActiveSummaryIndex(summaries.length > 1 ? 0 : null);
    } else if (activeSummaryIndex !== null && activeSummaryIndex > index) {
      setActiveSummaryIndex(activeSummaryIndex - 1);
    }
  }

  const activeSummary =
    activeSummaryIndex !== null ? summaries[activeSummaryIndex] : null;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        {feedback && (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="doc-title" className="text-sm font-medium">
            {t('titleLabel')}
          </label>
          <input
            id="doc-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('titlePlaceholder')}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="doc-content" className="text-sm font-medium">
              {t('pasteLabel')}
            </label>
            {content.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {t('charCount', { count: content.length })}
              </span>
            )}
          </div>
          <textarea
            id="doc-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('pastePlaceholder')}
            className="min-h-[300px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            maxLength={100000}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSummarize}
            disabled={summarizing || content.length < 100}
            className="flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {summarizing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('summarizing')}
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                {t('summarize')}
              </>
            )}
          </button>
          {content.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
            >
              {t('clearDocument')}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {activeSummary ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('summaryTitle')}</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSummaryIndex(null);
                    setTitle('');
                    setContent('');
                  }}
                  className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                >
                  <Plus className="h-3 w-3" />
                  {t('newDocument')}
                </button>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" />
                      {tCommon('copiedToClipboard')}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      {t('copyAll')}
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-md border p-4">
              <h3 className="mb-1 text-sm font-semibold text-muted-foreground">
                {activeSummary.title}
              </h3>
            </div>

            <SummarySection label={t('oneLine')}>
              <p className="text-sm">{activeSummary.summary.one_line}</p>
            </SummarySection>

            <SummarySection label={t('keyChanges')}>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {activeSummary.summary.key_changes.map((change, i) => (
                  <li key={i}>{change}</li>
                ))}
              </ul>
            </SummarySection>

            <SummarySection label={t('whoAffected')}>
              <div className="flex flex-wrap gap-2">
                {activeSummary.summary.who_affected.map((group, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
                  >
                    {group}
                  </span>
                ))}
              </div>
            </SummarySection>

            <SummarySection label={t('timeline')}>
              <p className="text-sm">{activeSummary.summary.timeline}</p>
            </SummarySection>

            <SummarySection label={t('yourDistrict')}>
              <p className="text-sm">
                {activeSummary.summary.district_impact}
              </p>
            </SummarySection>

            <SummarySection label={t('talkingPoints')}>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {activeSummary.summary.talking_points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </SummarySection>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-16">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-center text-muted-foreground">
              {t('noDocuments')}
            </p>
          </div>
        )}

        {summaries.length > 1 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">{t('history')}</h3>
            <div className="space-y-1">
              {summaries.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
                    activeSummaryIndex === i
                      ? 'border-primary bg-primary/5'
                      : 'cursor-pointer hover:bg-accent'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveSummaryIndex(i)}
                    className="flex-1 text-left"
                  >
                    <span className="font-medium">{s.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleTimeString()}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSummary(i)}
                    className="ml-2 rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummarySection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-md border p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h3>
      {children}
    </div>
  );
}
