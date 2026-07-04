'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { setLocaleAction } from '@/actions/locale.action';
import type { AppLocale } from '@/i18n/locales';

/** Bascule FR/EN de la langue de l'interface (cookie NEXT_LOCALE). */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const t = useTranslations('navbar');
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (next: AppLocale) => {
    if (next === locale || isPending) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  };

  const btnClass = (active: boolean) =>
    `px-2 py-0.5 rounded text-sm font-semibold transition-colors ${
      active
        ? 'bg-[#0F52BA] text-white'
        : 'text-gray-500 hover:text-[#0F52BA]'
    } ${isPending ? 'opacity-60' : ''}`;

  return (
    <div className={`flex items-center gap-1 ${className}`} data-testid="language-switcher">
      <button
        type="button"
        className={btnClass(locale === 'fr')}
        onClick={() => switchLocale('fr')}
        aria-label={t('switchToFrench')}
        aria-pressed={locale === 'fr'}
      >
        FR
      </button>
      <span className="text-gray-300">/</span>
      <button
        type="button"
        className={btnClass(locale === 'en')}
        onClick={() => switchLocale('en')}
        aria-label={t('switchToEnglish')}
        aria-pressed={locale === 'en'}
      >
        EN
      </button>
    </div>
  );
}
