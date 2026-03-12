'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import {
  LayoutDashboard,
  PenTool,
  Share2,
  ScrollText,
  User,
  LogOut,
} from 'lucide-react';
import { LocaleToggle } from './locale-toggle';
import { cn } from '@/frontend/lib/utils';
import { createClient } from '@/backend/lib/supabase/client';

const navItems = [
  { href: '/dashboard', labelKey: 'dashboard' as const, icon: LayoutDashboard },
  { href: '/generate/speech', labelKey: 'speech' as const, icon: PenTool },
  { href: '/generate/ad', labelKey: 'ad' as const, icon: Share2 },
  { href: '/generate/pledge', labelKey: 'pledge' as const, icon: ScrollText },
  { href: '/profile', labelKey: 'profile' as const, icon: User },
];

export function NavBar() {
  const t = useTranslations('Nav');
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout failed:', error.message);
      return;
    }
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 font-bold text-lg">
          <Link href="/dashboard">Civic Pulse</Link>
        </div>

        <nav className="flex items-center gap-1 text-sm">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-accent',
                  isActive && 'bg-accent text-accent-foreground',
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {t(item.labelKey)}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LocaleToggle />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t('logout')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
