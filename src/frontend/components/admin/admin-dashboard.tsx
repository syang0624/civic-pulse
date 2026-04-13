'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

type ToolKey = 'speech' | 'email' | 'ad' | 'sentiment' | 'pledge' | 'strategy';

type AdminStatsResponse = {
  totals: {
    users: number;
    generations: number;
    issues: number;
    today_generations: number;
  };
  generations_by_tool: Record<ToolKey, number>;
  generations_last_7_days: Array<{ date: string; count: number }>;
  top_users: Array<{
    id: string;
    name: string | null;
    email: string | null;
    district_name: string | null;
    generations_count: number;
  }>;
  recent_activity: Array<{
    id: string;
    tool: string;
    created_at: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
    };
  }>;
};

const TOOL_ORDER: ToolKey[] = ['speech', 'email', 'ad', 'sentiment', 'pledge', 'strategy'];

export function AdminDashboard() {
  const t = useTranslations('Admin');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/admin/stats', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to fetch admin stats');
        }

        const data = (await response.json()) as AdminStatsResponse;
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch admin stats');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const maxToolCount = useMemo(() => {
    if (!stats) return 1;
    return Math.max(1, ...TOOL_ORDER.map((tool) => stats.generations_by_tool[tool] ?? 0));
  }, [stats]);

  const maxTrendCount = useMemo(() => {
    if (!stats) return 1;
    return Math.max(1, ...stats.generations_last_7_days.map((item) => item.count));
  }, [stats]);

  if (loading) {
    return <div className="rounded-3xl border bg-card p-8 text-sm text-muted-foreground">Loading admin stats...</div>;
  }

  if (error || !stats) {
    return (
      <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-8 text-sm text-destructive">
        {error ?? 'Failed to load admin stats'}
      </div>
    );
  }

  const statCards = [
    { label: t('totalUsers'), value: stats.totals.users },
    { label: t('totalGenerations'), value: stats.totals.generations },
    { label: t('totalIssues'), value: stats.totals.issues },
    { label: t('todayGenerations'), value: stats.totals.today_generations },
  ];

  return (
    <section className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => (
          <article
            key={item.label}
            className="rounded-3xl border bg-gradient-to-br from-card via-card to-secondary/20 p-5 shadow-sm"
          >
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{item.value.toLocaleString()}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight">{t('usageByFeature')}</h2>
          <div className="mt-5 space-y-4">
            {TOOL_ORDER.map((tool) => {
              const count = stats.generations_by_tool[tool] ?? 0;
              const width = `${Math.max(8, Math.round((count / maxToolCount) * 100))}%`;
              return (
                <div key={tool} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{t(tool)}</span>
                    <span className="text-muted-foreground">{count.toLocaleString()}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary"
                      style={{ width }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-3xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight">{t('weeklyTrend')}</h2>
          <div className="mt-6 flex h-44 items-end gap-3">
            {stats.generations_last_7_days.map((item) => {
              const height = `${Math.max(8, Math.round((item.count / maxTrendCount) * 100))}%`;
              const label = item.date.slice(5);
              return (
                <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="text-xs text-muted-foreground">{item.count}</div>
                  <div className="relative flex h-full w-full items-end">
                    <div
                      className="w-full rounded-t-xl bg-gradient-to-t from-primary to-primary/40"
                      style={{ height }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              );
            })}
          </div>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight">{t('topUsers')}</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">{t('userName')}</th>
                  <th className="pb-3 pr-4 font-medium">{t('userEmail')}</th>
                  <th className="pb-3 text-right font-medium">{t('userGenerations')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_users.map((user) => (
                  <tr key={user.id} className="border-b/60 last:border-b-0">
                    <td className="py-3 pr-4">{user.name ?? '-'}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{user.email ?? '-'}</td>
                    <td className="py-3 text-right font-semibold">{user.generations_count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-3xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight">{t('recentActivity')}</h2>
          <ul className="mt-4 space-y-3">
            {stats.recent_activity.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border bg-secondary/20 px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {(item.user.name ?? item.user.email ?? item.user.id)} · {item.tool}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{item.user.email ?? 'No email'}</p>
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
