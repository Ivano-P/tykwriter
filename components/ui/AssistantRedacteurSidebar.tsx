'use client';

import * as Diff from 'diff';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { RotateCcw, Mail, Link as LinkIcon } from 'lucide-react';
import { SaveAsNoteButton } from './SaveAsNoteButton';
import { ReportBugLink } from './ReportBugLink';
import type { AssistantTone, AssistantAbreviations } from '@/services/prompts/assistantRedacteur.prompt';
import type { RecentCorrection } from '@/app/(workspace)/assistant-redacteur/page';
import styles from './CorrectionSidebar.module.css';

// Les passages inchangés d'un diff peuvent être longs (passe finale sur tout
// le texte) : on ne garde qu'un peu de contexte autour des modifications.
const CONTEXT_CHARS = 24;

function compactUnchanged(value: string, isFirst: boolean, isLast: boolean): string {
  if (value.length <= CONTEXT_CHARS * 2 + 1) return value;
  if (isFirst) return `…${value.slice(-CONTEXT_CHARS)}`;
  if (isLast) return `${value.slice(0, CONTEXT_CHARS)}…`;
  return `${value.slice(0, CONTEXT_CHARS)}…${value.slice(-CONTEXT_CHARS)}`;
}

// Les valeurs restent les identifiants internes envoyés au prompt ;
// seuls les libellés affichés sont traduits (clés du namespace assistantSidebar).
const TONE_CHOICES: { value: AssistantTone; labelKey: string }[] = [
  { value: 'auto', labelKey: 'toneAuto' },
  { value: 'amical', labelKey: 'toneAmical' },
  { value: 'professionnel', labelKey: 'toneProfessionnel' },
  { value: 'soutenu', labelKey: 'toneSoutenu' },
];

const ABREVIATION_CHOICES: { value: AssistantAbreviations; labelKey: string }[] = [
  { value: 'conserver', labelKey: 'abbreviationsConserver' },
  { value: 'developper', labelKey: 'abbreviationsDevelopper' },
];

interface AssistantRedacteurSidebarProps {
  isProcessing: boolean;
  diffParts: Diff.Change[] | null;
  recentCorrections: RecentCorrection[];
  handleUndo: () => void;
  handleManualSubmit: () => void;
  isSubmitDisabled: boolean;
  isAutoCorrectEnabled: boolean;
  setIsAutoCorrectEnabled: (val: boolean) => void;
  isFinalChecking: boolean;
  handleFormatEmail: () => void;
  isLinkEnabled: boolean;
  setIsLinkEnabled: (val: boolean) => void;
  tone: AssistantTone;
  setTone: (val: AssistantTone) => void;
  abreviations: AssistantAbreviations;
  setAbreviations: (val: AssistantAbreviations) => void;
  /** « Enregistrer en note » (connectés uniquement — le bouton se masque seul). */
  saveAsNote?: { text: string; modeLabel: string };
}

export function AssistantRedacteurSidebar({
  isProcessing,
  diffParts,
  recentCorrections,
  handleUndo,
  handleManualSubmit,
  isSubmitDisabled,
  isAutoCorrectEnabled,
  setIsAutoCorrectEnabled,
  isFinalChecking,
  handleFormatEmail,
  isLinkEnabled,
  setIsLinkEnabled,
  tone,
  setTone,
  abreviations,
  setAbreviations,
  saveAsNote,
}: AssistantRedacteurSidebarProps) {
  const t = useTranslations('assistantSidebar');

  return (
    <aside className={styles.sidebarContainer}>
      <h2 className={styles.title}>{t('actions')}</h2>
      <div className={styles.separator} />

      <div className={styles.actionSection}>

        {/* La vérification finale n'a plus de bouton dédié : elle est incluse
            dans la correction automatique (hint affiché sous le toggle). */}
        <div className={styles.toggleContainer}>
          <label className={styles.toggleLabel} title={t('finalCheckHint')}>
            <span className={styles.toggleText}>{t('autoCorrect')}</span>
            <div className={styles.toggleWrapper}>
              <input
                type="checkbox"
                className={styles.toggleCheckbox}
                checked={isAutoCorrectEnabled}
                onChange={(e) => setIsAutoCorrectEnabled(e.target.checked)}
                disabled={isProcessing}
              />
              <div className={styles.toggleSlider}></div>
            </div>
          </label>
        </div>
        <p className={styles.toggleHint}>
          {t('finalCheckHint')}
        </p>

        {isFinalChecking && (
          <div className={styles.processingIndicator}>
            {t('finalChecking')}
          </div>
        )}

        <Button
          onClick={handleManualSubmit}
          disabled={isSubmitDisabled}
          className={styles.submitButton}
        >
          {isProcessing ? t('checking') : t('checkNow')}
        </Button>

        {saveAsNote && <SaveAsNoteButton {...saveAsNote} />}

        <div className={styles.secondaryActionsGrid}>
          <button
            onClick={handleFormatEmail}
            disabled={isProcessing || isSubmitDisabled}
            className={styles.secondaryActionBtn}
            title={t('emailPolitenessTitle')}
          >
            <Mail size={16} />
            <span>{t('emailPoliteness')}</span>
          </button>

          <button
            onClick={() => setIsLinkEnabled(!isLinkEnabled)}
            disabled={isProcessing}
            className={`${styles.secondaryActionBtn} ${isLinkEnabled ? styles.secondaryActionBtnActive : ''}`}
            title={t('linkToggleTitle')}
          >
            <LinkIcon size={16} />
            <span>{t('link')}</span>
          </button>
        </div>

        <div className={styles.optionsSection}>
          <h3 className={styles.optionsTitle}>{t('writingOptions')}</h3>

          <div className={styles.optionGroup}>
            <span className={styles.optionLabel}>{t('tone')}</span>
            <div className={styles.segmentedControl}>
              {TONE_CHOICES.map(({ value, labelKey }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTone(value)}
                  className={`${styles.segmentBtn} ${tone === value ? styles.segmentBtnActive : ''}`}
                  title={t('toneChoiceTitle', { label: t(labelKey) })}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.optionGroup}>
            <span className={styles.optionLabel}>{t('abbreviations')}</span>
            <div className={styles.segmentedControl}>
              {ABREVIATION_CHOICES.map(({ value, labelKey }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAbreviations(value)}
                  className={`${styles.segmentBtn} ${abreviations === value ? styles.segmentBtnActive : ''}`}
                  title={t('abbreviationsChoiceTitle', { label: t(labelKey) })}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {diffParts && diffParts.length === 0 && !isProcessing && (
        <div className="mt-4 p-3 text-center text-[var(--tyk-sapphire)] font-medium text-sm">
          {t('noErrors')}
        </div>
      )}

      {/* Historique persistant : le surlignement dans l'éditeur s'efface au
          bout de quelques secondes, cette liste garde les dernières corrections
          (la plus récente en premier — seule annulable). */}
      {recentCorrections.length > 0 && (
        <div className={styles.diffViewer}>
          <div className={styles.diffHeader}>
            <span className={styles.diffTitle}>{t('recentCorrections')}</span>
            <button
              className={styles.undoButton}
              onClick={handleUndo}
              disabled={isProcessing}
              title={t('undoCorrectionTitle')}
            >
              <RotateCcw size={16} />
              <span>{t('undo')}</span>
            </button>
          </div>
          <ul className={styles.correctionList}>
            {recentCorrections.map((correction) => (
              <li key={correction.id} className={styles.correctionItem}>
                {correction.parts.map((part: Diff.Change, index: number) => {
                  if (part.added) return <span key={index} className={styles.diffAdded}>{part.value}</span>;
                  if (part.removed) return <span key={index} className={styles.diffRemoved}>{part.value}</span>;
                  return (
                    <span key={index}>
                      {compactUnchanged(part.value, index === 0, index === correction.parts.length - 1)}
                    </span>
                  );
                })}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ReportBugLink />

    </aside>
  );
}
