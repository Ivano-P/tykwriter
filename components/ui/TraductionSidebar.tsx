'use client';

import { useTranslations } from 'next-intl';
import styles from './CorrectionSidebar.module.css'; // Réutilise le CSS principal de la sidebar

export function TraductionSidebar() {
  const t = useTranslations('traductionSidebar');

  return (
    <aside className={styles.sidebarContainer}>
      <h2 className={styles.title}>{t('actions')}</h2>
      <div className={styles.separator} />

      <div className={styles.actionSection} style={{ textAlign: 'center', opacity: 0.6, marginTop: '2rem' }}>
        <p>{t('comingSoon')}</p>
      </div>
    </aside>
  );
}
