'use client';

import { useTranslations } from 'next-intl';
import { Shield } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/frontend/lib/utils';

export function AdminNavItem({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations('Nav');
  const pathname = usePathname();

  if (!isAdmin) {
    return null;
  }

  const isActive = pathname.startsWith('/admin');

  return (
    <Link
      href="/admin"
      className={cn(
        'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-secondary text-primary'
          : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
      )}
    >
      <Shield className="h-4 w-4" />
      <span className="hidden sm:inline">{t('admin')}</span>
    </Link>
  );
}
