'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/frontend/lib/utils';
import { AdminDashboard } from '@/frontend/components/admin/admin-dashboard';
import { UserList } from '@/frontend/components/admin/user-list';
import { UserDetail } from '@/frontend/components/admin/user-detail';

type Tab = 'dashboard' | 'users';

export function AdminPanel() {
  const t = useTranslations('Admin');
  const tNav = useTranslations('Nav');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t('title')}
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground/80">
          {t('subtitle')}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab('dashboard');
            setSelectedUserId(null);
          }}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'dashboard'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
          )}
        >
          {tNav('dashboard')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'users'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
          )}
        >
          {t('users')}
        </button>
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'dashboard' && <AdminDashboard />}
        {activeTab === 'users' &&
          (selectedUserId ? (
            <UserDetail userId={selectedUserId} onBack={() => setSelectedUserId(null)} />
          ) : (
            <UserList onViewUser={(userId) => setSelectedUserId(userId)} />
          ))}
      </div>
    </div>
  );
}
