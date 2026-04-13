'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { ArrowLeft, CheckCircle2, Loader2, Pencil, Trash2, XCircle } from 'lucide-react';
import { cn } from '@/frontend/lib/utils';

type AdminUserProfile = {
  id: string;
  email: string | null;
  name: string | null;
  district_name: string | null;
  district_code: string | null;
  party: string | null;
  tone: string | null;
  target_demographics: string[] | null;
  background: string | null;
  created_at: string;
};

type AdminUserGeneration = {
  id: string;
  tool: 'speech' | 'email' | 'ad' | 'sentiment' | 'pledge' | 'strategy' | string;
  input_params: Record<string, unknown>;
  created_at: string;
  locale: string;
};

type AdminUserDetailResponse = {
  user: AdminUserProfile;
  generations: AdminUserGeneration[];
};

const toolBadgeStyle: Record<'speech' | 'email' | 'ad' | 'sentiment' | 'pledge' | 'strategy', string> = {
  speech: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  email: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  ad: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  sentiment: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  pledge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  strategy: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
};

function readString(params: Record<string, unknown>, key: string): string | null {
  const value = params[key];
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readStringArray(params: Record<string, unknown>, key: string): string[] {
  const value = params[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function extractContentLabel(generation: AdminUserGeneration): string {
  const topic = readString(generation.input_params, 'topic');
  if (topic) {
    return topic;
  }

  const issueTitle = readString(generation.input_params, 'issue_title');
  if (issueTitle) {
    return issueTitle;
  }

  const focusAreas = readStringArray(generation.input_params, 'focus_areas');
  if (focusAreas.length > 0) {
    return focusAreas.join(', ');
  }

  const platform = readString(generation.input_params, 'platform');
  if (platform) {
    return platform;
  }

  return '-';
}

export function UserDetail({ userId, onBack }: { userId: string; onBack?: () => void }) {
  const t = useTranslations('Admin');
  const tCommon = useTranslations('Common');
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminUserDetailResponse | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [party, setParty] = useState('');

  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function fetchUserDetail() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/users/${userId}`, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(tCommon('error'));
        }

        const payload = (await response.json()) as AdminUserDetailResponse;
        setData(payload);
        setName(payload.user.name ?? '');
        setDistrictName(payload.user.district_name ?? '');
        setParty(payload.user.party ?? '');
      } catch (err) {
        setError(err instanceof Error ? err.message : tCommon('error'));
      } finally {
        setLoading(false);
      }
    }

    fetchUserDetail();
  }, [tCommon, userId]);

  const generationRows = data?.generations ?? [];

  const toolLabels = useMemo(
    () => ({
      speech: t('speech'),
      email: t('email'),
      ad: t('ad'),
      sentiment: t('sentiment'),
      pledge: t('pledge'),
      strategy: t('strategy'),
    }),
    [t],
  );

  function resetDraft() {
    setName(data?.user.name ?? '');
    setDistrictName(data?.user.district_name ?? '');
    setParty(data?.user.party ?? '');
  }

  async function handleSave() {
    if (!data) {
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          district_name: districtName,
          party,
        }),
      });

      if (!response.ok) {
        throw new Error(tCommon('error'));
      }

      const updated = (await response.json()) as { user: AdminUserProfile };
      setData((current) => {
        if (!current) return current;
        return {
          ...current,
          user: {
            ...current.user,
            ...updated.user,
            email: current.user.email,
          },
        };
      });

      setFeedback({ kind: 'success', text: t('userUpdated') });
      setEditMode(false);
    } catch (err) {
      setFeedback({ kind: 'error', text: err instanceof Error ? err.message : tCommon('error') });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!data) {
      return;
    }

    if (!window.confirm(t('deleteUserConfirm'))) {
      return;
    }

    setDeleting(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/users/${data.user.id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(tCommon('error'));
      }

      if (onBack) {
        onBack();
      } else {
        router.push('/admin/users');
      }
    } catch (err) {
      setFeedback({ kind: 'error', text: err instanceof Error ? err.message : tCommon('error') });
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <section className="space-y-5">
        <div className="rounded-3xl border bg-card p-6 shadow-sm">
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="h-16 animate-pulse rounded-2xl bg-muted" />
            <div className="h-16 animate-pulse rounded-2xl bg-muted" />
            <div className="h-16 animate-pulse rounded-2xl bg-muted" />
            <div className="h-16 animate-pulse rounded-2xl bg-muted" />
          </div>
        </div>
        <div className="rounded-3xl border bg-card p-6 shadow-sm">
          <div className="h-7 w-36 animate-pulse rounded bg-muted" />
          <div className="mt-5 h-48 animate-pulse rounded-2xl bg-muted" />
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-3xl border border-destructive/30 bg-destructive/10 p-8 text-sm text-destructive">
        {error ?? tCommon('error')}
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {feedback && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm',
            feedback.kind === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-destructive/30 bg-destructive/10 text-destructive',
          )}
        >
          {feedback.kind === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {feedback.text}
        </div>
      )}

      <article className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">{t('userDetail')}</h2>

          {!editMode ? (
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                setEditMode(true);
              }}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-secondary"
            >
              <Pencil className="h-4 w-4" />
              {t('editUser')}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t('saveChanges')}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetDraft();
                  setFeedback(null);
                  setEditMode(false);
                }}
                className="rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-secondary"
              >
                {t('cancelEdit')}
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border bg-secondary/20 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('userName')}</p>
            {editMode ? (
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            ) : (
              <p className="mt-1 text-sm font-medium text-foreground">{data.user.name ?? '-'}</p>
            )}
          </div>

          <div className="rounded-2xl border bg-secondary/20 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('userEmail')}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{data.user.email ?? '-'}</p>
          </div>

          <div className="rounded-2xl border bg-secondary/20 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('userRegion')}</p>
            {editMode ? (
              <input
                type="text"
                value={districtName}
                onChange={(event) => setDistrictName(event.target.value)}
                className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            ) : (
              <p className="mt-1 text-sm font-medium text-foreground">{data.user.district_name ?? '-'}</p>
            )}
          </div>

          <div className="rounded-2xl border bg-secondary/20 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('userParty')}</p>
            {editMode ? (
              <input
                type="text"
                value={party}
                onChange={(event) => setParty(event.target.value)}
                className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            ) : (
              <p className="mt-1 text-sm font-medium text-foreground">{data.user.party ?? '-'}</p>
            )}
          </div>

          <div className="rounded-2xl border bg-secondary/20 px-4 py-3 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('userSignup')}</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {new Date(data.user.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </article>

      <article className="rounded-3xl border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight">{t('userActivity')}</h2>

        {generationRows.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed bg-secondary/20 px-4 py-6 text-sm text-muted-foreground">
            {t('noActivity')}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/20 text-left text-muted-foreground">
                  <th className="px-3 py-3 font-medium">{t('tool')}</th>
                  <th className="px-3 py-3 font-medium">{t('content')}</th>
                  <th className="px-3 py-3 font-medium">{t('generatedAt')}</th>
                  <th className="px-3 py-3 font-medium">{t('locale')}</th>
                </tr>
              </thead>
              <tbody>
                {generationRows.map((generation) => {
                  const isKnownTool = generation.tool in toolBadgeStyle;
                  const tool = generation.tool as 'speech' | 'email' | 'ad' | 'sentiment' | 'pledge' | 'strategy';

                  return (
                    <tr key={generation.id} className="border-b last:border-b-0">
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                            isKnownTool ? toolBadgeStyle[tool] : 'bg-secondary text-secondary-foreground',
                          )}
                        >
                          {isKnownTool ? toolLabels[tool] : generation.tool}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-foreground">{extractContentLabel(generation)}</td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {new Date(generation.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{generation.locale.toUpperCase()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-full border border-destructive/30 px-4 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {t('deleteUser')}
          </button>

          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-secondary"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('backToList')}
            </button>
          ) : (
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-secondary"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('backToList')}
            </Link>
          )}
        </div>
      </article>
    </section>
  );
}
