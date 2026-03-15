'use client';

import * as Diff from 'diff';
import { Button } from '@/components/ui/button';
import { RotateCcw, Mail } from 'lucide-react';
import styles from './CorrectionSidebar.module.css';

interface AssistantRedacteurSidebarProps {
  isProcessing: boolean;
  diffParts: Diff.Change[] | null;
  handleUndo: () => void;
  handleManualSubmit: () => void;
  isSubmitDisabled: boolean;
  isAutoCorrectEnabled: boolean;
  setIsAutoCorrectEnabled: (val: boolean) => void;
  handleFormatEmail: () => void;
}

export function AssistantRedacteurSidebar({
  isProcessing,
  diffParts,
  handleUndo,
  handleManualSubmit,
  isSubmitDisabled,
  isAutoCorrectEnabled,
  setIsAutoCorrectEnabled,
  handleFormatEmail,
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
