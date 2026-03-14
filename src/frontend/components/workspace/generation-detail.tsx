'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Check,
  Clipboard,
  Pencil,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import type { Generation } from '@/shared/types';

interface GenerationDetailProps {
  generation: Generation;
  onClose: () => void;
  onDelete: (generation: Generation) => void;
  onSaved: (generation: Generation) => void;
}

interface AdStructured {
  title?: string;
  content?: string;
  hashtags?: string[];
  image_suggestions?: string[];
}

interface PledgeStructured {
  rank?: number;
  title?: string;
  problem?: string;
  solution?: string;
  timeline?: string;
  expected_outcomes?: string[];
  talking_points?: string[];
  priority_reason?: string;
  estimated_budget?: string;
}

function parseJson<T>(input: string): T | null {
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

export function GenerationDetail({
  generation,
  onClose,
  onDelete,
  onSaved,
}: GenerationDetailProps) {
  const t = useTranslations('Workspace');
  const tCommon = useTranslations('Common');
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState(generation.edited_text ?? generation.output_text);

  const content = generation.edited_text?.trim() || generation.output_text;

  const adStructured = useMemo(
    () => (generation.tool === 'ad' ? parseJson<AdStructured>(content) : null),
    [content, generation.tool],
  );

  const pledges = useMemo(() => {
    if (generation.tool !== 'pledge') {
      return [];
    }
    const parsed = parseJson<PledgeStructured[]>(content);
    return Array.isArray(parsed) ? parsed : [];
  }, [content, generation.tool]);

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave() {
    if (!draft.trim()) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/generations/${generation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edited_text: draft }),
      });

      if (!res.ok) {
        throw new Error('Failed to save');
      }

      const updated = (await res.json()) as Generation;
      onSaved(updated);
      setIsEditMode(false);
    } finally {
      setSaving(false);
    }
  }

  const createdLabel = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(generation.created_at));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="relative flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-card shadow-xl">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {tCommon('back')}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDelete(generation)}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {tCommon('delete')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
              {tCommon('close')}
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[1fr_320px]">
          <section className="min-h-0 overflow-y-auto p-6">
            {!isEditMode && (
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  {copied ? tCommon('copiedToClipboard') : tCommon('copy')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <Pencil className="h-4 w-4" />
                  {t('editContent')}
                </button>
              </div>
            )}

            {isEditMode ? (
              <div className="space-y-4">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={20}
                  className="w-full rounded-xl border bg-background px-4 py-3 text-base leading-relaxed shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !draft.trim()}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {t('saveEdit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(content);
                      setIsEditMode(false);
                    }}
                    className="rounded-full border px-5 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    {t('cancelEdit')}
                  </button>
                </div>
              </div>
            ) : generation.tool === 'ad' && adStructured ? (
              <div className="space-y-5">
                <div className="rounded-xl border bg-muted/20 p-5">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Title</h3>
                  <p className="text-xl font-semibold text-foreground">{adStructured.title || '-'}</p>
                </div>
                <div className="rounded-xl border bg-muted/20 p-5">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Content</h3>
                  <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{adStructured.content || '-'}</p>
                </div>
                <div className="rounded-xl border bg-muted/20 p-5">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Hashtags</h3>
                  <div className="flex flex-wrap gap-2">
                    {(adStructured.hashtags ?? []).length > 0
                      ? (adStructured.hashtags ?? []).map((tag) => (
                        <span key={tag} className="rounded-full border bg-background px-3 py-1 text-sm">
                          #{tag}
                        </span>
                      ))
                      : <p className="text-sm text-muted-foreground">-</p>}
                  </div>
                </div>
                <div className="rounded-xl border bg-muted/20 p-5">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Images</h3>
                  <ul className="space-y-2 text-sm text-foreground/90">
                    {(adStructured.image_suggestions ?? []).length > 0
                      ? (adStructured.image_suggestions ?? []).map((item, index) => (
                        <li key={`${item}-${index}`}>{index + 1}. {item}</li>
                      ))
                      : <li className="text-muted-foreground">-</li>}
                  </ul>
                </div>
              </div>
            ) : generation.tool === 'pledge' && pledges.length > 0 ? (
              <div className="space-y-3">
                {pledges.map((pledge, index) => (
                  <details
                    key={`${pledge.title ?? 'pledge'}-${index}`}
                    className="rounded-xl border bg-muted/10"
                    open={index === 0}
                  >
                    <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-foreground">
                      #{pledge.rank ?? index + 1} {pledge.title ?? 'Pledge'}
                    </summary>
                    <div className="space-y-3 border-t px-5 py-4 text-sm text-foreground/90">
                      <p><span className="font-semibold">Problem:</span> {pledge.problem ?? '-'}</p>
                      <p><span className="font-semibold">Solution:</span> {pledge.solution ?? '-'}</p>
                      <p><span className="font-semibold">Timeline:</span> {pledge.timeline ?? '-'}</p>
                      <p><span className="font-semibold">Budget:</span> {pledge.estimated_budget ?? '-'}</p>
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <article className="prose prose-stone max-w-none whitespace-pre-wrap rounded-xl border bg-muted/10 p-6 leading-loose text-foreground/90 dark:prose-invert">
                {content}
              </article>
            )}
          </section>

          <aside className="min-h-0 overflow-y-auto border-t bg-muted/20 p-6 lg:border-l lg:border-t-0">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t('inputParams')}
            </h3>

            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground">{t('createdAt')}</dt>
                <dd className="mt-1 font-medium text-foreground">{createdLabel}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tool</dt>
                <dd className="mt-1 font-medium text-foreground">{generation.tool}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Locale</dt>
                <dd className="mt-1 font-medium text-foreground">{generation.locale.toUpperCase()}</dd>
              </div>
              {Object.entries(generation.input_params).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {Array.isArray(value)
                      ? value.join(', ')
                      : typeof value === 'object' && value !== null
                        ? JSON.stringify(value)
                        : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </div>
    </div>
  );
}
