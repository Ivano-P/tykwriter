'use client';

import * as Diff from 'diff';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { RotateCcw, Mail, Link as LinkIcon } from 'lucide-react';
import type { AssistantTone, AssistantAbreviations } from '@/services/prompts/assistantRedacteur.prompt';
import styles from './CorrectionSidebar.module.css';

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
  handleUndo: () => void;
  handleManualSubmit: () => void;
  isSubmitDisabled: boolean;
  isAutoCorrectEnabled: boolean;
  setIsAutoCorrectEnabled: (val: boolean) => void;
  isFinalCheckEnabled: boolean;
  setIsFinalCheckEnabled: (val: boolean) => void;
  isFinalChecking: boolean;
  handleFormatEmail: () => void;
  isLinkEnabled: boolean;
  setIsLinkEnabled: (val: boolean) => void;
  tone: AssistantTone;
  setTone: (val: AssistantTone) => void;
  abreviations: AssistantAbreviations;
  setAbreviations: (val: AssistantAbreviations) => void;
}

export function AssistantRedacteurSidebar({
  isProcessing,
  diffParts,
  handleUndo,
  handleManualSubmit,
  isSubmitDisabled,
  isAutoCorrectEnabled,
  setIsAutoCorrectEnabled,
  isFinalCheckEnabled,
  setIsFinalCheckEnabled,
  isFinalChecking,
  handleFormatEmail,
  isLinkEnabled,
  setIsLinkEnabled,
  tone,
  setTone,
  abreviations,
  setAbreviations,
}: AssistantRedacteurSidebarProps) {
  const t = useTranslations('assistantSidebar');

  return (
    <aside className={styles.sidebarContainer}>
      <h2 className={styles.title}>{t('actions')}</h2>
      <div className={styles.separator} />

      <div className={styles.actionSection}>

        <div className={styles.toggleContainer}>
          <label className={styles.toggleLabel}>
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

        <div className={styles.toggleContainer}>
          <label className={styles.toggleLabel} title={t('finalCheckHint')}>
            <span className={styles.toggleText}>{t('finalCheck')}</span>
            <div className={styles.toggleWrapper}>
              <input
                type="checkbox"
                className={styles.toggleCheckbox}
                checked={isFinalCheckEnabled}
                onChange={(e) => setIsFinalCheckEnabled(e.target.checked)}
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

      {diffParts && diffParts.length > 0 && !isProcessing && (
        <div className={styles.diffViewer}>
          <div className={styles.diffHeader}>
            <span className={styles.diffTitle}>{t('correctionApplied')}</span>
            <button className={styles.undoButton} onClick={handleUndo} title={t('undoCorrectionTitle')}>
              <RotateCcw size={16} />
              <span>{t('undo')}</span>
            </button>
          </div>
          <div className={styles.diffContent}>
            {diffParts.map((part: Diff.Change, index: number) => {
              if (part.added) return <span key={index} className={styles.diffAdded}>{part.value}</span>;
              if (part.removed) return <span key={index} className={styles.diffRemoved}>{part.value}</span>;
              return <span key={index}>{part.value}</span>;
            })}
          </div>
        </div>
      )}

    </aside>
  );
}
