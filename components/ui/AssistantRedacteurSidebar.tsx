'use client';

import * as Diff from 'diff';
import { Button } from '@/components/ui/button';
import { RotateCcw, Mail, Link as LinkIcon } from 'lucide-react';
import type { AssistantTone, AssistantAbreviations } from '@/services/prompts/assistantRedacteur.prompt';
import styles from './CorrectionSidebar.module.css';

const TONE_CHOICES: { value: AssistantTone; label: string }[] = [
  { value: 'aucun', label: 'Aucun' },
  { value: 'amical', label: 'Amical' },
  { value: 'professionnel', label: 'Professionnel' },
  { value: 'soutenu', label: 'Soutenu' },
];

const ABREVIATION_CHOICES: { value: AssistantAbreviations; label: string }[] = [
  { value: 'conserver', label: 'Conserver' },
  { value: 'developper', label: 'Développer' },
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

  return (
    <aside className={styles.sidebarContainer}>
      <h2 className={styles.title}>Actions</h2>
      <div className={styles.separator} />

      <div className={styles.actionSection}>

        <div className={styles.toggleContainer}>
          <label className={styles.toggleLabel}>
            <span className={styles.toggleText}>Correction automatique</span>
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
          <label className={styles.toggleLabel} title="Relecture globale automatique après une pause d'écriture.">
            <span className={styles.toggleText}>Vérification finale</span>
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
          Relecture globale automatique après une pause d&apos;écriture.
        </p>

        {isFinalChecking && (
          <div className={styles.processingIndicator}>
            Vérification finale…
          </div>
        )}

        <Button
          onClick={handleManualSubmit}
          disabled={isSubmitDisabled}
          className={styles.submitButton}
        >
          {isProcessing ? 'Vérification...' : "Vérifier maintenant"}
        </Button>

        <div className={styles.secondaryActionsGrid}>
          <button
            onClick={handleFormatEmail}
            disabled={isProcessing || isSubmitDisabled}
            className={styles.secondaryActionBtn}
            title="Ajouter les formules de politesse"
          >
            <Mail size={16} />
            <span>Politesse email</span>
          </button>

          <button
            onClick={() => setIsLinkEnabled(!isLinkEnabled)}
            disabled={isProcessing}
            className={`${styles.secondaryActionBtn} ${isLinkEnabled ? styles.secondaryActionBtnActive : ''}`}
            title="Activer/Désactiver Lien"
          >
            <LinkIcon size={16} />
            <span>Lien</span>
          </button>
        </div>

        <div className={styles.optionsSection}>
          <h3 className={styles.optionsTitle}>Options d&apos;écriture</h3>

          <div className={styles.optionGroup}>
            <span className={styles.optionLabel}>Ton</span>
            <div className={styles.segmentedControl}>
              {TONE_CHOICES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTone(value)}
                  className={`${styles.segmentBtn} ${tone === value ? styles.segmentBtnActive : ''}`}
                  title={`Ton : ${label}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.optionGroup}>
            <span className={styles.optionLabel}>Abréviations</span>
            <div className={styles.segmentedControl}>
              {ABREVIATION_CHOICES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAbreviations(value)}
                  className={`${styles.segmentBtn} ${abreviations === value ? styles.segmentBtnActive : ''}`}
                  title={`Abréviations : ${label}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {diffParts && diffParts.length === 0 && !isProcessing && (
        <div className="mt-4 p-3 text-center text-[var(--tyk-sapphire)] font-medium text-sm">
          Aucune erreur détectées
        </div>
      )}

      {diffParts && diffParts.length > 0 && !isProcessing && (
        <div className={styles.diffViewer}>
          <div className={styles.diffHeader}>
            <span className={styles.diffTitle}>Correction appliquée</span>
            <button className={styles.undoButton} onClick={handleUndo} title="Annuler la correction">
              <RotateCcw size={16} />
              <span>Annuler</span>
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
