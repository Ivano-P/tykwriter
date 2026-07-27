'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import styles from './ThemeToggle.module.css';

const THEME_COOKIE = 'tyk-theme';

/* Mini-store du thème : source de vérité = classe `dark` sur <html>
   (posée côté serveur via le cookie, voir app/layout.tsx). */
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains('dark');
}

// Rendu serveur : le bouton s'hydrate en clair puis se resynchronise.
function getServerSnapshot(): boolean {
  return false;
}

function setTheme(dark: boolean): void {
  document.documentElement.classList.toggle('dark', dark);
  document.cookie = `${THEME_COOKIE}=${dark ? 'dark' : 'light'}; path=/; max-age=31536000; samesite=lax`;
  listeners.forEach((listener) => listener());
}

/** Bascule clair/sombre, persistée en cookie (pas de flash au chargement). */
export function ThemeToggle() {
  const t = useTranslations('navbar');
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <button
      className={styles.toggle}
      onClick={() => setTheme(!isDark)}
      aria-label={isDark ? t('themeToLight') : t('themeToDark')}
      title={isDark ? t('themeToLight') : t('themeToDark')}
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
