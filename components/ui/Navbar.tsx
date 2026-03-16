'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X, ChevronDown } from 'lucide-react';
import styles from './Navbar.module.css';

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModesDropdownOpen, setIsModesDropdownOpen] = useState(false);
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);

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
            {/* Espace vide commenté pour l'authentification */}
            {/* <AuthButtons /> */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={styles.iconButton}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* DESKTOP VIEW */}
        <div className="hidden md:flex items-center justify-between w-full relative">
          {/* Left: Modes Dropdown */}
          <div className="flex items-center ml-4">
            <div className="relative">
              <button
                className={styles.dropdownToggle}
                onClick={() => setIsModesDropdownOpen(!isModesDropdownOpen)}
                onBlur={() => setTimeout(() => setIsModesDropdownOpen(false), 200)}
              >
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-base">Mode:</span>
                  <span className="font-medium opacity-80 text-sm">correcteur</span>
                </div>
                <ChevronDown size={16} className="ml-1" />
              </button>
              {isModesDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  <Link href="/" className={styles.dropdownItem}>Correcteur</Link>
                  <button disabled className={styles.dropdownItemDisabled}>Traduction (Arrive bientôt)</button>
                  <button disabled className={styles.dropdownItemDisabled}>Maître rédacteur (Arrive bientôt)</button>
                </div>
              )}
            </div>
          </div>

          {/* Center: Logo (absolutely centered) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
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

          {/* Right: "En savoir plus" and Auth space */}
          <div className="flex items-center mr-4 gap-6">
            <div className="relative">
              <button
                className={styles.dropdownToggle}
                onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                onBlur={() => setTimeout(() => setIsMoreDropdownOpen(false), 200)}
              >
                En savoir plus <ChevronDown size={16} />
              </button>
              {isMoreDropdownOpen && (
                <div className={styles.dropdownMenuRight}>
                  <Link href="/about" className={styles.dropdownItem}>À propos de nous</Link>
                  <Link href="/feuille-de-route" className={styles.dropdownItem}>Feuille de route</Link>
                  <Link href="https://tykwriter-test.tykdev.com/" className={styles.dropdownItem}>Tester la nouvelle version</Link>
                </div>
              )}
            </div>

            {/* Espace vide commenté pour l'authentification */}
            {/* <AuthButtons /> */}
          </div>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg absolute w-full left-0 mt-2 py-2 flex flex-col z-50">
          <div className="px-4 py-2 flex items-center gap-1">
            <span className="font-bold text-[#0F52BA] text-base">Mode:</span>
            <span className="font-medium text-[#0F52BA] opacity-80 text-sm">correcteur</span>
          </div>
          <Link href="/" className="px-6 py-2 bg-gray-50 text-[#0F52BA] font-semibold border-l-4 border-[#0F52BA]">Correcteur</Link>
          <div className="px-6 py-2 text-gray-400">Traduction (Arrive bientôt)</div>
          <div className="px-6 py-2 text-gray-400">Maître rédacteur (Arrive bientôt)</div>

          <div className="border-t border-gray-100 my-2"></div>

          <div className="px-4 py-2 font-bold text-[#0F52BA]">En savoir plus</div>
          <Link href="/about" className="px-6 py-2 hover:bg-gray-50 text-gray-700">À propos de nous</Link>
          <Link href="/feuille-de-route" className="px-6 py-2 hover:bg-gray-50 text-gray-700">Feuille de route</Link>
          <Link href="https://tykwriter-test.tykdev.com/" className="px-6 py-2 hover:bg-gray-50 text-gray-700">text next version</Link>
        </div>
      )}
    </nav>
  );
}
