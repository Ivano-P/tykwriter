'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  TARGET_LANGUAGES,
  sanitizeTargetLanguage,
  type TargetLanguage,
} from '@/services/prompts/traduction.prompt';
import styles from './CorrectionSidebar.module.css'; // Réutilise le CSS principal de la sidebar

interface TraductionSidebarProps {
  targetLanguage: TargetLanguage;
  setTargetLanguage: (val: TargetLanguage) => void;
  isTranslating: boolean;
}

export function TraductionSidebar({
  targetLanguage,
  setTargetLanguage,
  isTranslating,
}: TraductionSidebarProps) {
  const t = useTranslations('traductionSidebar');
  const uiLocale = useLocale();

  // Libellés des langues cibles dans la langue de l'UI (natif, sans catalogue).
  const languageNames = useMemo(
    () => new Intl.DisplayNames([uiLocale], { type: 'language' }),
    [uiLocale]
  );
  const labelOf = (lang: TargetLanguage): string => {
    try {
      return languageNames.of(lang) ?? lang;
    } catch {
      return lang;
    }
  };

  return (
    <aside className={styles.sidebarContainer}>
      <h2 className={styles.title}>{t('actions')}</h2>
      <div className={styles.separator} />

      <div className={styles.optionsSection}>
        <div className={styles.optionGroup}>
          <label className={styles.optionLabel} htmlFor="traduction-target-language">
            {t('targetLanguage')}
          </label>
          <select
            id="traduction-target-language"
            className={styles.optionSelect}
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(sanitizeTargetLanguage(e.target.value))}
          >
            {TARGET_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {labelOf(lang)}
              </option>
            ))}
          </select>
        </div>
        <p className={styles.toggleHint}>{t('autoTranslateHint')}</p>
      </div>

      {isTranslating && (
        <div className={styles.processingIndicator}>{t('translating')}</div>
      )}
    </aside>
  );
}
