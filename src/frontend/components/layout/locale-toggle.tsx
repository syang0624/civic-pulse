'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

const localeLabels: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
};

export function LocaleToggle() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const nextLocale: Locale = locale === 'ko' ? 'en' : 'ko';

  function handleToggle() {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <button
      onClick={handleToggle}
      className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      aria-label={`Switch to ${localeLabels[nextLocale]}`}
    >
      {localeLabels[nextLocale]}
    </button>
  );
}
