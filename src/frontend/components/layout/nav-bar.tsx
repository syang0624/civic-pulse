'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import {
  LayoutDashboard,
  PenTool,
  Share2,
  ScrollText,
  Target,
  FolderOpen,
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
  { href: '/generate/strategy', labelKey: 'strategy' as const, icon: Target },
  { href: '/workspace', labelKey: 'workspace' as const, icon: FolderOpen },
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <div className="mr-8 font-semibold text-lg tracking-tight">
          <Link href="/dashboard" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            Civic Pulse
          </Link>
        </div>

        <nav className="flex items-center gap-1 text-sm">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
                  isActive 
                    ? 'bg-secondary text-primary' 
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
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
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-destructive/5 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t('logout')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
