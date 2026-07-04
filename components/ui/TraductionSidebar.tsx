'use client';

import { useTranslations } from 'next-intl';
import styles from './CorrectionSidebar.module.css'; // Réutilise le CSS principal de la sidebar

interface TraductionSidebarProps {
  isTranslating: boolean;
}

export function TraductionSidebar({ isTranslating }: TraductionSidebarProps) {
  const t = useTranslations('traductionSidebar');

  return (
    <aside className={styles.sidebarContainer}>
      <h2 className={styles.title}>{t('actions')}</h2>
      <div className={styles.separator} />

      <p className={styles.toggleHint}>{t('autoTranslateHint')}</p>

      {isTranslating && (
        <div className={styles.processingIndicator}>{t('translating')}</div>
      )}
    </aside>
  );
}
