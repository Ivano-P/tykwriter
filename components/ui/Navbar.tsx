'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import styles from './Navbar.module.css';

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
        </div>
      )}
    </nav>
  );
}
