'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { setLocaleAction } from '@/actions/locale.action';
import type { AppLocale } from '@/i18n/locales';
import styles from './Navbar.module.css';

function LanguageSwitcher({ className = '' }: { className?: string }) {
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

export function Navbar() {
  const t = useTranslations('navbar');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModesDropdownOpen, setIsModesDropdownOpen] = useState(false);
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);

  const pathname = usePathname();

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        {/* MOBILE VIEW */}
        <div className="md:hidden flex items-center justify-between w-full">
          <div className="flex items-center ml-2">
            <Link href="/">
              <Image
                src="/images/tykwriter_logo.png"
                alt="Tykwriter Logo"
                width={120}
                height={32}
                priority
                className="object-contain"
              />
            </Link>
          </div>
          <div className="flex items-center mr-2 gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={styles.iconButton}
              aria-label={t('toggleMenu')}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* DESKTOP VIEW */}
        <div className="hidden md:flex items-center justify-between w-full">
          {/* Left: Logo */}
          <div className="flex items-center">
            <Link href="/">
              <Image
                src="/images/tykwriter_logo.png"
                alt="Tykwriter Logo"
                width={160}
                height={42}
                priority
                className="object-contain"
              />
            </Link>
          </div>

          {/* Right: "En savoir plus" and Mode selector */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <button
                className={styles.dropdownToggle}
                onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                onBlur={() => setTimeout(() => setIsMoreDropdownOpen(false), 200)}
              >
                {t('learnMore')} <ChevronDown size={16} />
              </button>
              {isMoreDropdownOpen && (
                <div className={styles.dropdownMenuRight}>
                  <Link href="/about" className={styles.dropdownItem}>{t('about')}</Link>
                  <Link href="/feuille-de-route" className={styles.dropdownItem}>{t('roadmap')}</Link>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                className={styles.dropdownToggle}
                onClick={() => setIsModesDropdownOpen(!isModesDropdownOpen)}
                onBlur={() => setTimeout(() => setIsModesDropdownOpen(false), 200)}
              >
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-base">{t('mode')}</span>
                </div>
                <ChevronDown size={16} className="ml-1" />
              </button>
              {isModesDropdownOpen && (
                <div className={styles.dropdownMenuRight}>
                  <Link href="/correcteur" className={styles.dropdownItem}>{t('correcteur')}</Link>
                  <Link href="/assistant-redacteur" className={styles.dropdownItem}>{t('assistantExperimental')}</Link>
                  <Link href="/traduction" className={styles.dropdownItem}>{t('traduction')}</Link>
                </div>
              )}
            </div>

            <LanguageSwitcher />
          </div>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg absolute w-full left-0 mt-2 py-2 flex flex-col z-50">
          <div className="px-4 py-2 flex items-center gap-1">
            <span className="font-bold text-[#0F52BA] text-base">{t('modeMobile')}</span>
          </div>
          <Link href="/correcteur" className={`px-6 py-2 ${pathname === '/correcteur' ? 'bg-gray-50 text-[#0F52BA] font-semibold border-l-4 border-[#0F52BA]' : 'hover:bg-gray-50 text-gray-700'}`} onClick={() => setIsMobileMenuOpen(false)}>{t('correcteur')}</Link>
          <Link href="/traduction" className={`px-6 py-2 ${pathname === '/traduction' ? 'bg-gray-50 text-[#0F52BA] font-semibold border-l-4 border-[#0F52BA]' : 'hover:bg-gray-50 text-gray-700'}`} onClick={() => setIsMobileMenuOpen(false)}>{t('traduction')}</Link>
          <Link href="/assistant-redacteur" className={`px-6 py-2 ${pathname === '/assistant-redacteur' ? 'bg-gray-50 text-[#0F52BA] font-semibold border-l-4 border-[#0F52BA]' : 'hover:bg-gray-50 text-gray-700'}`} onClick={() => setIsMobileMenuOpen(false)}>{t('assistant')}</Link>

          <div className="border-t border-gray-100 my-2"></div>

          <div className="px-4 py-2 font-bold text-[#0F52BA]">{t('learnMore')}</div>
          <Link href="/about" className="px-6 py-2 hover:bg-gray-50 text-gray-700">{t('about')}</Link>
          <Link href="/feuille-de-route" className="px-6 py-2 hover:bg-gray-50 text-gray-700">{t('roadmap')}</Link>

          <div className="border-t border-gray-100 my-2"></div>

          <div className="px-4 py-2 flex items-center justify-between">
            <span className="font-bold text-[#0F52BA]">{t('language')}</span>
            <LanguageSwitcher className="mr-2" />
          </div>
        </div>
      )}
    </nav>
  );
}
