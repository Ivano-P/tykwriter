'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { SaveAsNoteButton } from './SaveAsNoteButton';
import { ReportBugLink } from './ReportBugLink';
import styles from './CorrectionSidebar.module.css'; // Réutilise le CSS principal de la sidebar

interface TraductionSidebarProps {
  isTranslating: boolean;
  onManualTranslate: () => void;
  isTranslateDisabled: boolean;
  /** Traductions alternatives de la traduction affichée (textes courts). */
  alternatives: string[];
  onPickAlternative: (alternative: string) => void;
  /** « Enregistrer en note » (connectés uniquement — le bouton se masque seul). */
  saveAsNote?: { text: string; modeLabel: string };
}

export function TraductionSidebar({
  isTranslating,
  onManualTranslate,
  isTranslateDisabled,
  alternatives,
  onPickAlternative,
  saveAsNote,
}: TraductionSidebarProps) {
  const t = useTranslations('traductionSidebar');

  return (
    <aside className={styles.sidebarContainer}>
      <h2 className={styles.title}>{t('actions')}</h2>
      <div className={styles.separator} />

      <div className={styles.actionSection}>
        <Button
          onClick={onManualTranslate}
          disabled={isTranslateDisabled}
          className={styles.submitButton}
        >
          {isTranslating ? t('translating') : t('translateNow')}
        </Button>
        <p className={styles.toggleHint}>{t('autoTranslateHint')}</p>
        {saveAsNote && <SaveAsNoteButton {...saveAsNote} />}
      </div>

      {alternatives.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 overflow-y-auto pr-2 flex-1 min-h-0">
          <div className={styles.diffHeader}>
            <span className={styles.diffTitle}>{t('alternatives')}</span>
          </div>
          {alternatives.map((alternative) => (
            <button
              key={alternative}
              onClick={() => onPickAlternative(alternative)}
              className="p-3 border border-gray-200 rounded-md transition-all text-sm text-left cursor-pointer hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm text-gray-700"
              title={t('alternativePickTitle')}
            >
              {alternative}
            </button>
          ))}
        </div>
      )}

      {isTranslating && (
        <div className={styles.processingIndicator}>{t('translating')}</div>
      )}

      <ReportBugLink />
    </aside>
  );
}
