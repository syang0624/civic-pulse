'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import {
  ArrowLeft,
  Check,
  Clipboard,
  Download,
  FileText,
  Loader2,
  Monitor,
  Pencil,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import type { Generation, Locale } from '@/shared/types';

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

interface StrategyStructured {
  issue_summary?: string;
  key_voter_groups?: Array<{
    group?: string;
    concern?: string;
    approach?: string;
  }>;
  messaging_angle?: {
    core_message?: string;
    framing?: string;
    tone_recommendation?: string;
  };
  campaign_actions?: Array<{
    action?: string;
    timeline?: string;
    expected_impact?: string;
  }>;
  talking_points?: string[];
  social_media_strategy?: {
    key_hashtags?: string[];
    content_themes?: string[];
    recommended_platforms?: string[];
    post_frequency?: string;
  };
  risks_and_counters?: Array<{
    risk?: string;
    counter?: string;
  }>;
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
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null);
  const [textDraft, setTextDraft] = useState('');
  const [adDraft, setAdDraft] = useState<AdStructured | null>(null);
  const [pledgeDraft, setPledgeDraft] = useState<PledgeStructured[] | null>(null);
  const [strategyDraft, setStrategyDraft] = useState<StrategyStructured | null>(null);

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

  const strategyStructured = useMemo(
    () => (generation.tool === 'strategy' ? parseJson<StrategyStructured>(content) : null),
    [content, generation.tool],
  );

  function startEditing() {
    if (generation.tool === 'ad') {
      setAdDraft(adStructured || { title: '', content: '', hashtags: [], image_suggestions: [] });
    } else if (generation.tool === 'pledge') {
      setPledgeDraft(pledges.length > 0 ? pledges : [{ title: '', problem: '', solution: '', timeline: '', estimated_budget: '' }]);
    } else if (generation.tool === 'strategy') {
      setStrategyDraft(strategyStructured || {});
    } else {
      setTextDraft(content);
    }
    setIsEditMode(true);
  }

  function cancelEditing() {
    setIsEditMode(false);
    setAdDraft(null);
    setPledgeDraft(null);
    setStrategyDraft(null);
    setTextDraft('');
  }

  const toolLabel = useMemo(() => {
    if (generation.tool === 'speech') return t('tabs.speech');
    if (generation.tool === 'ad') return t('tabs.ad');
    if (generation.tool === 'strategy') return t('tabs.strategy');
    return t('tabs.pledge');
  }, [generation.tool, t]);

  function buildCopyContent() {
    if (generation.tool === 'ad' && adStructured) {
      const hashtags = (adStructured.hashtags ?? []).map((tag) => `#${tag}`).join(' ');
      const images = (adStructured.image_suggestions ?? []).map((item, idx) => `${idx + 1}. ${item}`).join('\n');
      return [
        `Title\n${adStructured.title ?? '-'}`,
        `Content\n${adStructured.content ?? '-'}`,
        `Hashtags\n${hashtags || '-'}`,
        `Image Suggestions\n${images || '-'}`,
      ].join('\n\n');
    }

    if (generation.tool === 'pledge' && pledges.length > 0) {
      return pledges
        .map((pledge, index) => [
          `${pledge.rank ?? index + 1}. ${pledge.title ?? 'Pledge'}`,
          `Problem: ${pledge.problem ?? '-'}`,
          `Solution: ${pledge.solution ?? '-'}`,
          `Timeline: ${pledge.timeline ?? '-'}`,
          `Budget: ${pledge.estimated_budget ?? '-'}`,
        ].join('\n'))
        .join('\n\n');
    }

    if (generation.tool === 'strategy' && strategyStructured) {
      return [
        `Issue Summary\n${strategyStructured.issue_summary ?? '-'}`,
        `Key Voter Groups\n${(strategyStructured.key_voter_groups ?? []).map((group, index) => `${index + 1}. ${group.group ?? '-'} | ${group.concern ?? '-'} | ${group.approach ?? '-'}`).join('\n') || '-'}`,
        `Messaging Angle\n- Core Message: ${strategyStructured.messaging_angle?.core_message ?? '-'}\n- Framing: ${strategyStructured.messaging_angle?.framing ?? '-'}\n- Tone Recommendation: ${strategyStructured.messaging_angle?.tone_recommendation ?? '-'}`,
        `Campaign Actions\n${(strategyStructured.campaign_actions ?? []).map((action, index) => `${index + 1}. ${action.action ?? '-'} (${action.timeline ?? '-'}) - ${action.expected_impact ?? '-'}`).join('\n') || '-'}`,
        `Talking Points\n${(strategyStructured.talking_points ?? []).map((point, index) => `${index + 1}. ${point}`).join('\n') || '-'}`,
        `Social Media Strategy\n- Hashtags: ${(strategyStructured.social_media_strategy?.key_hashtags ?? []).join(', ') || '-'}\n- Themes: ${(strategyStructured.social_media_strategy?.content_themes ?? []).join(', ') || '-'}\n- Platforms: ${(strategyStructured.social_media_strategy?.recommended_platforms ?? []).join(', ') || '-'}\n- Frequency: ${strategyStructured.social_media_strategy?.post_frequency ?? '-'}`,
        `Risks & Counters\n${(strategyStructured.risks_and_counters ?? []).map((item, index) => `${index + 1}. ${item.risk ?? '-'} -> ${item.counter ?? '-'}`).join('\n') || '-'}`,
      ].join('\n\n');
    }

    return content;
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(buildCopyContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleExport(format: 'pdf' | 'docx') {
    setExporting(format);
    try {
      const res = await fetch(`/api/export/${generation.id}?format=${format}`, {
        headers: { 'x-locale': locale },
      });
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${toolLabel.toLowerCase().replace(/\s+/g, '-')}-${generation.id.slice(0, 8)}.${format === 'pdf' ? 'pdf' : 'docx'}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  }

  async function handleSave() {
    let finalText = '';

    if (generation.tool === 'ad' && adDraft) {
      finalText = JSON.stringify(adDraft);
    } else if (generation.tool === 'pledge' && pledgeDraft) {
      finalText = JSON.stringify(pledgeDraft);
    } else if (generation.tool === 'strategy' && strategyDraft) {
      finalText = JSON.stringify(strategyDraft);
    } else {
      finalText = textDraft;
    }

    if (!finalText.trim()) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/generations/${generation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edited_text: finalText }),
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
                  onClick={startEditing}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <Pencil className="h-4 w-4" />
                  {t('editContent')}
                </button>
                {generation.tool === 'speech' && (
                  <button
                    type="button"
                    onClick={() => router.push(`/teleprompter/${generation.id}`)}
                    className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    <Monitor className="h-4 w-4" />
                    {t('teleprompter')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleExport('pdf')}
                  disabled={exporting !== null}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
                >
                  {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {exporting === 'pdf' ? t('exporting') : t('exportPdf')}
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('docx')}
                  disabled={exporting !== null}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
                >
                  {exporting === 'docx' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  {exporting === 'docx' ? t('exporting') : t('exportDocx')}
                </button>
              </div>
            )}

            {isEditMode ? (
              <div className="space-y-8 pb-10">
                {generation.tool === 'ad' && adDraft ? (
                  <div className="space-y-6">
                    <div className="rounded-xl border bg-muted/20 p-5">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('editTitle')}</label>
                      <input
                        value={adDraft.title || ''}
                        onChange={(e) => setAdDraft({ ...adDraft, title: e.target.value })}
                        className="w-full rounded-xl border bg-background px-4 py-3 text-sm shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-5">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('editContentLabel')}</label>
                      <textarea
                        value={adDraft.content || ''}
                        onChange={(e) => setAdDraft({ ...adDraft, content: e.target.value })}
                        rows={10}
                        className="w-full rounded-xl border bg-background px-4 py-3 text-base leading-relaxed shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-5">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('editHashtags')}</label>
                      <input
                        value={adDraft.hashtags?.join(', ') || ''}
                        onChange={(e) => setAdDraft({ ...adDraft, hashtags: e.target.value.split(',').map((s) => s.trim()) })}
                        className="w-full rounded-xl border bg-background px-4 py-3 text-sm shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-5">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('editImageSuggestions')}</label>
                      <textarea
                        value={adDraft.image_suggestions?.join('\n') || ''}
                        onChange={(e) => setAdDraft({ ...adDraft, image_suggestions: e.target.value.split('\n') })}
                        rows={5}
                        className="w-full rounded-xl border bg-background px-4 py-3 text-base leading-relaxed shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                  </div>
                ) : generation.tool === 'pledge' && pledgeDraft ? (
                  <div className="space-y-4">
                    {pledgeDraft.map((pledge, idx) => (
                      <details key={idx} className="group rounded-xl border bg-muted/10 open:bg-muted/20" open>
                        <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-foreground hover:text-primary">
                          #{pledge.rank || idx + 1} {pledge.title || 'Pledge'}
                        </summary>
                        <div className="space-y-4 border-t px-5 py-4">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('editTitle')}</label>
                            <input
                              value={pledge.title || ''}
                              onChange={(e) => {
                                const newPledges = [...pledgeDraft];
                                newPledges[idx] = { ...pledge, title: e.target.value };
                                setPledgeDraft(newPledges);
                              }}
                              className="w-full rounded-xl border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('editProblem')}</label>
                            <textarea
                              value={pledge.problem || ''}
                              onChange={(e) => {
                                const newPledges = [...pledgeDraft];
                                newPledges[idx] = { ...pledge, problem: e.target.value };
                                setPledgeDraft(newPledges);
                              }}
                              rows={3}
                              className="w-full rounded-xl border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('editSolution')}</label>
                            <textarea
                              value={pledge.solution || ''}
                              onChange={(e) => {
                                const newPledges = [...pledgeDraft];
                                newPledges[idx] = { ...pledge, solution: e.target.value };
                                setPledgeDraft(newPledges);
                              }}
                              rows={3}
                              className="w-full rounded-xl border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                            />
                          </div>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('editTimeline')}</label>
                              <input
                                value={pledge.timeline || ''}
                                onChange={(e) => {
                                  const newPledges = [...pledgeDraft];
                                  newPledges[idx] = { ...pledge, timeline: e.target.value };
                                  setPledgeDraft(newPledges);
                                }}
                                className="w-full rounded-xl border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t('editBudget')}</label>
                              <input
                                value={pledge.estimated_budget || ''}
                                onChange={(e) => {
                                  const newPledges = [...pledgeDraft];
                                  newPledges[idx] = { ...pledge, estimated_budget: e.target.value };
                                  setPledgeDraft(newPledges);
                                }}
                                className="w-full rounded-xl border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                              />
                            </div>
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                ) : generation.tool === 'strategy' && strategyDraft ? (
                  <div className="space-y-6">
                    <div className="rounded-xl border bg-muted/20 p-5">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('editIssueSummary')}</label>
                      <textarea
                        value={strategyDraft.issue_summary || ''}
                        onChange={(e) => setStrategyDraft({ ...strategyDraft, issue_summary: e.target.value })}
                        rows={4}
                        className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                      />
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-5">
                      <label className="mb-4 block text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('editVoterGroups')}</label>
                      <div className="space-y-4">
                        {(strategyDraft.key_voter_groups || []).map((group, idx) => (
                          <div key={idx} className="rounded-lg border bg-background p-4">
                            <div className="mb-2 grid gap-2">
                              <input
                                placeholder={t('editGroup')}
                                value={group.group || ''}
                                onChange={(e) => {
                                  const newGroups = [...(strategyDraft.key_voter_groups || [])];
                                  newGroups[idx] = { ...group, group: e.target.value };
                                  setStrategyDraft({ ...strategyDraft, key_voter_groups: newGroups });
                                }}
                                className="w-full border-b bg-transparent px-2 py-1 font-medium focus:border-primary focus:outline-none"
                              />
                              <input
                                placeholder={t('editConcern')}
                                value={group.concern || ''}
                                onChange={(e) => {
                                  const newGroups = [...(strategyDraft.key_voter_groups || [])];
                                  newGroups[idx] = { ...group, concern: e.target.value };
                                  setStrategyDraft({ ...strategyDraft, key_voter_groups: newGroups });
                                }}
                                className="w-full border-b bg-transparent px-2 py-1 text-sm text-muted-foreground focus:border-primary focus:outline-none"
                              />
                              <input
                                placeholder={t('editApproach')}
                                value={group.approach || ''}
                                onChange={(e) => {
                                  const newGroups = [...(strategyDraft.key_voter_groups || [])];
                                  newGroups[idx] = { ...group, approach: e.target.value };
                                  setStrategyDraft({ ...strategyDraft, key_voter_groups: newGroups });
                                }}
                                className="w-full border-b bg-transparent px-2 py-1 text-sm text-muted-foreground focus:border-primary focus:outline-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-5">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('editMessagingAngle')}</label>
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 text-xs text-muted-foreground">{t('editCoreMessage')}</label>
                          <textarea
                            value={strategyDraft.messaging_angle?.core_message || ''}
                            onChange={(e) => setStrategyDraft({
                              ...strategyDraft,
                              messaging_angle: { ...strategyDraft.messaging_angle, core_message: e.target.value },
                            })}
                            rows={3}
                            className="w-full rounded-xl border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 text-xs text-muted-foreground">{t('editFraming')}</label>
                            <input
                              value={strategyDraft.messaging_angle?.framing || ''}
                              onChange={(e) => setStrategyDraft({
                                ...strategyDraft,
                                messaging_angle: { ...strategyDraft.messaging_angle, framing: e.target.value },
                              })}
                              className="w-full rounded-xl border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                            />
                          </div>
                          <div>
                            <label className="mb-1 text-xs text-muted-foreground">{t('editToneRecommendation')}</label>
                            <input
                              value={strategyDraft.messaging_angle?.tone_recommendation || ''}
                              onChange={(e) => setStrategyDraft({
                                ...strategyDraft,
                                messaging_angle: { ...strategyDraft.messaging_angle, tone_recommendation: e.target.value },
                              })}
                              className="w-full rounded-xl border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-5">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('editTalkingPoints')}</label>
                      <textarea
                        value={strategyDraft.talking_points?.join('\n') || ''}
                        onChange={(e) => setStrategyDraft({ ...strategyDraft, talking_points: e.target.value.split('\n') })}
                        rows={5}
                        className="w-full rounded-xl border bg-background px-4 py-3 text-base leading-relaxed shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                      />
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-5">
                      <label className="mb-4 block text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('editCampaignActions')}</label>
                      <div className="space-y-4">
                        {(strategyDraft.campaign_actions || []).map((action, idx) => (
                          <div key={idx} className="rounded-lg border bg-background p-4">
                            <div className="grid gap-2">
                              <input
                                placeholder={t('editAction')}
                                value={action.action || ''}
                                onChange={(e) => {
                                  const newActions = [...(strategyDraft.campaign_actions || [])];
                                  newActions[idx] = { ...action, action: e.target.value };
                                  setStrategyDraft({ ...strategyDraft, campaign_actions: newActions });
                                }}
                                className="w-full border-b bg-transparent px-2 py-1 font-medium focus:border-primary focus:outline-none"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  placeholder={t('editTimeline')}
                                  value={action.timeline || ''}
                                  onChange={(e) => {
                                    const newActions = [...(strategyDraft.campaign_actions || [])];
                                    newActions[idx] = { ...action, timeline: e.target.value };
                                    setStrategyDraft({ ...strategyDraft, campaign_actions: newActions });
                                  }}
                                  className="w-full border-b bg-transparent px-2 py-1 text-sm text-muted-foreground focus:border-primary focus:outline-none"
                                />
                                <input
                                  placeholder={t('editExpectedImpact')}
                                  value={action.expected_impact || ''}
                                  onChange={(e) => {
                                    const newActions = [...(strategyDraft.campaign_actions || [])];
                                    newActions[idx] = { ...action, expected_impact: e.target.value };
                                    setStrategyDraft({ ...strategyDraft, campaign_actions: newActions });
                                  }}
                                  className="w-full border-b bg-transparent px-2 py-1 text-sm text-muted-foreground focus:border-primary focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-5">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('editSocialMediaStrategy')}</label>
                      <div className="grid gap-4">
                        <div>
                          <label className="mb-1 text-xs text-muted-foreground">{t('editKeyHashtags')}</label>
                          <input
                            value={strategyDraft.social_media_strategy?.key_hashtags?.join(', ') || ''}
                            onChange={(e) => setStrategyDraft({
                              ...strategyDraft,
                              social_media_strategy: { ...strategyDraft.social_media_strategy, key_hashtags: e.target.value.split(',').map(s => s.trim()) },
                            })}
                            className="w-full rounded-xl border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                          />
                        </div>
                        <div>
                          <label className="mb-1 text-xs text-muted-foreground">{t('editContentThemes')}</label>
                          <input
                            value={strategyDraft.social_media_strategy?.content_themes?.join(', ') || ''}
                            onChange={(e) => setStrategyDraft({
                              ...strategyDraft,
                              social_media_strategy: { ...strategyDraft.social_media_strategy, content_themes: e.target.value.split(',').map(s => s.trim()) },
                            })}
                            className="w-full rounded-xl border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 text-xs text-muted-foreground">{t('editRecommendedPlatforms')}</label>
                            <input
                              value={strategyDraft.social_media_strategy?.recommended_platforms?.join(', ') || ''}
                              onChange={(e) => setStrategyDraft({
                                ...strategyDraft,
                                social_media_strategy: { ...strategyDraft.social_media_strategy, recommended_platforms: e.target.value.split(',').map(s => s.trim()) },
                              })}
                              className="w-full rounded-xl border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                            />
                          </div>
                          <div>
                            <label className="mb-1 text-xs text-muted-foreground">{t('editPostFrequency')}</label>
                            <input
                              value={strategyDraft.social_media_strategy?.post_frequency || ''}
                              onChange={(e) => setStrategyDraft({
                                ...strategyDraft,
                                social_media_strategy: { ...strategyDraft.social_media_strategy, post_frequency: e.target.value },
                              })}
                              className="w-full rounded-xl border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-5">
                      <label className="mb-4 block text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('editRisksAndCounters')}</label>
                      <div className="space-y-4">
                        {(strategyDraft.risks_and_counters || []).map((risk, idx) => (
                          <div key={idx} className="rounded-lg border bg-background p-4">
                            <div className="grid gap-2">
                              <input
                                placeholder={t('editRisk')}
                                value={risk.risk || ''}
                                onChange={(e) => {
                                  const newRisks = [...(strategyDraft.risks_and_counters || [])];
                                  newRisks[idx] = { ...risk, risk: e.target.value };
                                  setStrategyDraft({ ...strategyDraft, risks_and_counters: newRisks });
                                }}
                                className="w-full border-b bg-transparent px-2 py-1 font-medium text-destructive focus:border-primary focus:outline-none"
                              />
                              <input
                                placeholder={t('editCounter')}
                                value={risk.counter || ''}
                                onChange={(e) => {
                                  const newRisks = [...(strategyDraft.risks_and_counters || [])];
                                  newRisks[idx] = { ...risk, counter: e.target.value };
                                  setStrategyDraft({ ...strategyDraft, risks_and_counters: newRisks });
                                }}
                                className="w-full border-b bg-transparent px-2 py-1 text-sm text-muted-foreground focus:border-primary focus:outline-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <textarea
                    value={textDraft}
                    onChange={(event) => setTextDraft(event.target.value)}
                    rows={20}
                    className="w-full rounded-xl border bg-background px-4 py-3 text-base leading-relaxed shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                  />
                )}
                
                <div className="flex items-center gap-2 border-t pt-6">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {t('saveEdit')}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
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
