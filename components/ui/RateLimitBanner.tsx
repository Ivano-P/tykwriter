'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import styles from './RateLimitBanner.module.css';

/** Bannière « quota IA gratuit épuisé » avec lien vers la connexion. */
export function RateLimitBanner() {
  const t = useTranslations('rateLimit');
  return (
    <div className={styles.banner} role="alert">
      <span>{t('message')}</span>
      <Link href="/connexion" className={styles.link}>
        {t('signIn')}
      </Link>
    </div>
  );
}
