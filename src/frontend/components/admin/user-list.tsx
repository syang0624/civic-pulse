'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Eye, Trash2 } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/frontend/lib/utils';

type AdminUser = {
  id: string;
  email: string | null;
  name: string | null;
  district_name: string | null;
  party: string | null;
  created_at: string;
  generations_count: number;
};

type UserResponse = {
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

export function UserList({ onViewUser }: { onViewUser?: (userId: string) => void }) {
  const t = useTranslations('Admin');
  const tCommon = useTranslations('Common');
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<UserResponse | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      setError(null);
      setFeedback(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', '20');

        const response = await fetch(`/api/admin/users?${params.toString()}`, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(tCommon('error'));
        }

        const data = (await response.json()) as UserResponse;
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : tCommon('error'));
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [page, tCommon]);

  const filteredUsers = useMemo(() => {
    const users = result?.users ?? [];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return users;
    }

    return users.filter((user) => {
      const name = user.name?.toLowerCase() ?? '';
      const email = user.email?.toLowerCase() ?? '';
      return name.includes(normalizedQuery) || email.includes(normalizedQuery);
    });
  }, [query, result?.users]);

  async function handleDelete(user: AdminUser) {
    if (!window.confirm(t('deleteUserConfirm'))) {
      return;
    }

    setDeletingId(user.id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(tCommon('error'));
      }

      setResult((current) => {
        if (!current) {
          return current;
        }

        const users = current.users.filter((item) => item.id !== user.id);
        const total = Math.max(0, current.pagination.total - 1);
        return {
          users,
          pagination: {
            ...current.pagination,
            total,
            total_pages: Math.max(1, Math.ceil(total / current.pagination.limit)),
          },
        };
      });

      setFeedback({ kind: 'success', text: t('userDeleted') });
    } catch (err) {
      setFeedback({ kind: 'error', text: err instanceof Error ? err.message : tCommon('error') });
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <div className="rounded-3xl border bg-card p-8 text-sm text-muted-foreground">{tCommon('loading')}</div>;
  }

  if (error || !result) {
    return (
      <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-8 text-sm text-destructive">
        {error ?? tCommon('error')}
      </div>
    );
  }

  return (
    <section className="space-y-5">
      {feedback && (
        <div
          className={cn(
            'rounded-2xl border px-4 py-3 text-sm',
            feedback.kind === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-destructive/30 bg-destructive/10 text-destructive',
          )}
        >
          {feedback.text}
        </div>
      )}

      <div className="rounded-3xl border bg-card p-4 shadow-sm">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('searchUsers')}
          className="w-full rounded-2xl border bg-background px-4 py-3 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
      </div>

      <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/20 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">{t('userName')}</th>
                <th className="px-4 py-3 font-medium">{t('userEmail')}</th>
                <th className="px-4 py-3 font-medium">{t('userRegion')}</th>
                <th className="px-4 py-3 font-medium">{t('userParty')}</th>
                <th className="px-4 py-3 font-medium">{t('userSignup')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('userGenerations')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('viewUser')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('deleteUser')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    {t('noUsers')}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{user.name ?? '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email ?? '-'}</td>
                    <td className="px-4 py-3">{user.district_name ?? '-'}</td>
                    <td className="px-4 py-3">{user.party ?? '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{user.generations_count.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (onViewUser) {
                            onViewUser(user.id);
                          } else {
                            router.push(`/admin/users/${user.id}`);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium transition hover:bg-secondary"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {t('viewUser')}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        disabled={deletingId === user.id}
                        className="inline-flex items-center gap-1 rounded-xl border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('deleteUser')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {result.pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            className="rounded-xl border p-2 transition hover:bg-secondary disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <p className="text-sm text-muted-foreground">
            {page} / {result.pagination.total_pages}
          </p>

          <button
            type="button"
            onClick={() => setPage((current) => Math.min(result.pagination.total_pages, current + 1))}
            disabled={page >= result.pagination.total_pages}
            className="rounded-xl border p-2 transition hover:bg-secondary disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
}
