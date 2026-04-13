'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { GeneratingOverlay } from './generating-overlay';
import type { Generation } from '@/shared/types';

interface IssueItem {
  id: string;
  title_ko: string;
  title_en: string | null;
  description_ko: string | null;
  description_en: string | null;
  category: string;
  urgency: string;
}

interface IssueApiResponse {
  data: IssueItem[];
}

interface StrategyStructuredOutput {
  issue_summary: string;
  key_voter_groups: Array<{
    group: string;
    concern: string;
    approach: string;
  }>;
  messaging_angle: {
    core_message: string;
    framing: string;
    tone_recommendation: string;
  };
  campaign_actions: Array<{
    action: string;
    timeline: string;
    expected_impact: string;
  }>;
  talking_points: string[];
  social_media_strategy: {
    key_hashtags: string[];
    content_themes: string[];
    recommended_platforms: string[];
    post_frequency: string;
  };
  risks_and_counters: Array<{
    risk: string;
    counter: string;
  }>;
}

interface StrategyGenerationResponse extends Generation {
  structured?: StrategyStructuredOutput;
}

export function StrategyForm() {
  const t = useTranslations('Strategy');
  const tCommon = useTranslations('Common');
  const tc = useTranslations('Categories');
  const currentLocale = useLocale();
  const searchParams = useSearchParams();
  const issueIdFromUrl = searchParams.get('issueId');

  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [districtCode, setDistrictCode] = useState('');
  const [selectedIssueId, setSelectedIssueId] = useState(issueIdFromUrl ?? '');
  const [selectedIssue, setSelectedIssue] = useState<IssueItem | null>(null);
  const [focus, setFocus] = useState('');
  const [strictFactual, setStrictFactual] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [structuredOutput, setStructuredOutput] =
    useState<StrategyStructuredOutput | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSelectedIssueId(issueIdFromUrl ?? '');
  }, [issueIdFromUrl]);

  useEffect(() => {
    let mounted = true;

    async function fetchProfile() {
      try {
        const response = await fetch('/api/profile');
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { district_code?: string | null };
        if (mounted) {
          setDistrictCode(data.district_code ?? '');
        }
      } catch {
        if (mounted) {
          setDistrictCode('');
        }
      } finally {
        if (mounted) {
          setProfileLoading(false);
        }
      }
    }

    fetchProfile();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (issueIdFromUrl) {
      setIssuesLoading(true);
      fetch(`/api/issues/${issueIdFromUrl}`)
        .then((res) => res.json())
        .then((data: IssueItem) => {
          setSelectedIssue(data);
        })
        .catch(() => {
          setSelectedIssue(null);
        })
        .finally(() => {
          setIssuesLoading(false);
        });
      return;
    }

    if (profileLoading) {
      return;
    }

    setIssuesLoading(true);
    fetch('/api/issues?limit=20&region_code=' + encodeURIComponent(districtCode))
      .then((res) => res.json())
      .then((data: IssueApiResponse) => {
        const items = Array.isArray(data.data) ? data.data : [];
        setIssues(items);
      })
      .catch(() => {
        setIssues([]);
      })
      .finally(() => {
        setIssuesLoading(false);
      });
  }, [issueIdFromUrl, profileLoading, districtCode]);

  useEffect(() => {
    if (!selectedIssueId || issueIdFromUrl) {
      return;
    }
    const found = issues.find((issue) => issue.id === selectedIssueId) ?? null;
    setSelectedIssue(found);
  }, [selectedIssueId, issues, issueIdFromUrl]);

  const issueTitle = useMemo(() => {
    if (!selectedIssue) return '';
    return currentLocale === 'ko'
      ? selectedIssue.title_ko
      : selectedIssue.title_en || selectedIssue.title_ko;
  }, [selectedIssue, currentLocale]);

  const issueDescription = useMemo(() => {
    if (!selectedIssue) return null;
    return currentLocale === 'ko'
      ? selectedIssue.description_ko
      : selectedIssue.description_en || selectedIssue.description_ko;
  }, [selectedIssue, currentLocale]);

  async function handleGenerate() {
    if (!selectedIssueId) return;

    setLoading(true);
    setError(null);
    setStructuredOutput(null);

    try {
      const res = await fetch('/api/generate/strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-locale': currentLocale,
        },
        body: JSON.stringify({
          issue_id: selectedIssueId,
          focus: focus.trim() || undefined,
          strict_factual: strictFactual,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.error ?? tCommon('error');
        throw new Error(
          msg.includes('AI_RATE_LIMIT') ? tCommon('rateLimitError') : msg,
        );
      }

      const apiData = data as StrategyGenerationResponse;
      const outputData = apiData.structured || (() => {
        try {
          return JSON.parse(apiData.output_text) as StrategyStructuredOutput;
        } catch {
          return null;
        }
      })();

      if (!outputData) {
        throw new Error(tCommon('error'));
      }

      setStructuredOutput(outputData);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon('error'));
    } finally {
      setLoading(false);
    }
  }

  function buildCombinedOutput(data: StrategyStructuredOutput): string {
    return [
      `${t('issueSummary')}\n${data.issue_summary}`,
      `${t('keyVoterGroups')}\n${data.key_voter_groups
        .map((group, index) => `${index + 1}. ${group.group} | ${group.concern} | ${group.approach}`)
        .join('\n')}`,
      `${t('messagingAngle')}\n- ${t('coreMessage')}: ${data.messaging_angle.core_message}\n- ${t('framing')}: ${data.messaging_angle.framing}\n- ${t('toneRecommendation')}: ${data.messaging_angle.tone_recommendation}`,
      `${t('campaignActions')}\n${data.campaign_actions
        .map((action, index) => `${index + 1}. ${action.action} (${action.timeline}) - ${action.expected_impact}`)
        .join('\n')}`,
      `${t('talkingPoints')}\n${data.talking_points.map((point, index) => `${index + 1}. ${point}`).join('\n')}`,
      `${t('socialMediaStrategy')}\n- ${t('keyHashtags')}: ${data.social_media_strategy.key_hashtags.join(', ')}\n- ${t('contentThemes')}: ${data.social_media_strategy.content_themes.join(', ')}\n- ${t('recommendedPlatforms')}: ${data.social_media_strategy.recommended_platforms.join(', ')}\n- ${t('postFrequency')}: ${data.social_media_strategy.post_frequency}`,
      `${t('risksAndCounters')}\n${data.risks_and_counters
        .map((item, index) => `${index + 1}. ${item.risk} -> ${item.counter}`)
        .join('\n')}`,
    ].join('\n\n');
  }

  async function handleCopyFull() {
    if (!structuredOutput) return;
    await navigator.clipboard.writeText(buildCombinedOutput(structuredOutput));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const noIssues = !issueIdFromUrl && !issuesLoading && issues.length === 0;

  return (
    <div className="space-y-10 animate-fade-in">
      <section className="space-y-8 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        {issueIdFromUrl ? (
          <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('selectIssue')}
            </p>
            <p className="text-base font-semibold text-foreground">
              {issuesLoading ? tCommon('loading') : issueTitle || '-'}
            </p>
            {issueDescription && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {issueDescription}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <label
              htmlFor="strategy-issue"
              className="block text-sm font-semibold tracking-wide text-foreground"
            >
              {t('selectIssue')}
            </label>
            <select
              id="strategy-issue"
              value={selectedIssueId}
              onChange={(event) => setSelectedIssueId(event.target.value)}
              disabled={issuesLoading || noIssues}
              className="w-full appearance-none rounded-xl border bg-background px-4 py-3 text-base shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
            >
              <option value="">{t('selectIssuePlaceholder')}</option>
              {issues.map((issue) => (
                <option key={issue.id} value={issue.id}>
                  {currentLocale === 'ko'
                    ? issue.title_ko
                    : issue.title_en || issue.title_ko}
                </option>
              ))}
            </select>
            {noIssues && (
              <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                {t('noIssues')}
              </p>
            )}
          </div>
        )}

        {selectedIssue && (
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border bg-background px-3 py-1 text-xs font-medium">
                {tc(selectedIssue.category as Parameters<typeof tc>[0])}
              </span>
              <span className="rounded-full border bg-background px-3 py-1 text-xs font-medium">
                {selectedIssue.urgency}
              </span>
            </div>
            <p className="mt-3 text-base font-semibold">{issueTitle}</p>
            {issueDescription && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {issueDescription}
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          <label
            htmlFor="strategy-focus"
            className="block text-sm font-semibold tracking-wide text-foreground"
          >
            {t('focus')}
          </label>
          <input
            id="strategy-focus"
            type="text"
            value={focus}
            onChange={(event) => setFocus(event.target.value)}
            placeholder={t('focusPlaceholder')}
            className="w-full rounded-xl border bg-background px-4 py-3 text-base shadow-sm transition-all placeholder:text-muted-foreground/50 hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>

        <label className="flex items-center gap-3 rounded-xl border bg-background px-4 py-3 text-sm">
          <input
            type="checkbox"
            checked={strictFactual}
            onChange={(e) => setStrictFactual(e.target.checked)}
            className="h-4 w-4"
          />
          <span>{t('strictFactualHint')}</span>
        </label>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !selectedIssueId}
          className="w-full rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:scale-[1.01] hover:bg-primary/90 hover:shadow-md active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? t('generating') : t('generate')}
        </button>
      </section>

      {error && (
        <div className="animate-fade-in rounded-xl border border-destructive/20 bg-destructive/10 px-6 py-4 text-sm font-medium text-destructive">
          {error}
        </div>
      )}

      {structuredOutput && (
        <section className="animate-slide-up space-y-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <h3 className="text-xl font-bold tracking-tight">{t('title')}</h3>
            <button
              type="button"
              onClick={handleCopyFull}
              className="rounded-full bg-muted/50 px-4 py-1.5 text-sm font-medium text-foreground transition-all hover:bg-primary hover:text-primary-foreground"
            >
              {copied ? tCommon('copiedToClipboard') : tCommon('copy')}
            </button>
          </div>

          <div className="space-y-3 rounded-xl border bg-muted/20 p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('issueSummary')}
            </h4>
            <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
              {structuredOutput.issue_summary || '-'}
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t('keyVoterGroups')}
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              {structuredOutput.key_voter_groups.length > 0 ? (
                structuredOutput.key_voter_groups.map((group, index) => (
                  <article
                    key={`${group.group}-${index}`}
                    className="rounded-xl border bg-muted/20 p-4"
                  >
                    <p className="text-sm font-semibold text-foreground">{group.group}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{t('voterConcern')}: </span>
                      {group.concern}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{t('voterApproach')}: </span>
                      {group.approach}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-primary/5 p-5">
            <h4 className="text-sm font-bold uppercase tracking-wider text-primary">
              {t('messagingAngle')}
            </h4>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-foreground/90">
              <p><span className="font-semibold">{t('coreMessage')}: </span>{structuredOutput.messaging_angle.core_message || '-'}</p>
              <p><span className="font-semibold">{t('framing')}: </span>{structuredOutput.messaging_angle.framing || '-'}</p>
              <p><span className="font-semibold">{t('toneRecommendation')}: </span>{structuredOutput.messaging_angle.tone_recommendation || '-'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t('campaignActions')}
            </h4>
            <div className="space-y-3">
              {structuredOutput.campaign_actions.length > 0 ? (
                structuredOutput.campaign_actions.map((action, index) => (
                  <div
                    key={`${action.action}-${index}`}
                    className="rounded-xl border bg-muted/20 p-4"
                  >
                    <p className="font-semibold text-foreground">{index + 1}. {action.action}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{t('timeline')}: </span>
                      {action.timeline}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{t('expectedImpact')}: </span>
                      {action.expected_impact}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border bg-muted/20 p-5">
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t('talkingPoints')}
            </h4>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground/90">
              {structuredOutput.talking_points.length > 0 ? (
                structuredOutput.talking_points.map((point, index) => (
                  <li key={`${point}-${index}`}>{point}</li>
                ))
              ) : (
                <li>-</li>
              )}
            </ol>
          </div>

          <div className="rounded-xl border bg-muted/20 p-5">
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t('socialMediaStrategy')}
            </h4>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-foreground/90">
              <p><span className="font-semibold">{t('keyHashtags')}: </span>{structuredOutput.social_media_strategy.key_hashtags.join(', ') || '-'}</p>
              <p><span className="font-semibold">{t('contentThemes')}: </span>{structuredOutput.social_media_strategy.content_themes.join(', ') || '-'}</p>
              <p><span className="font-semibold">{t('recommendedPlatforms')}: </span>{structuredOutput.social_media_strategy.recommended_platforms.join(', ') || '-'}</p>
              <p><span className="font-semibold">{t('postFrequency')}: </span>{structuredOutput.social_media_strategy.post_frequency || '-'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t('risksAndCounters')}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {structuredOutput.risks_and_counters.length > 0 ? (
                structuredOutput.risks_and_counters.map((item, index) => (
                  <div
                    key={`${item.risk}-${index}`}
                    className="rounded-xl border bg-muted/20 p-4"
                  >
                    <p className="text-sm font-semibold text-foreground">{t('risk')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.risk}</p>
                    <p className="mt-3 text-sm font-semibold text-foreground">{t('counter')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.counter}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
          </div>
        </section>
      )}
      <GeneratingOverlay visible={loading} />
    </div>
  );
}
