'use client';

import * as Diff from 'diff';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import styles from './CorrectionSidebar.module.css';

interface CorrectionSidebarProps {
  isProcessing: boolean;
  diffParts: Diff.Change[] | null;
  handleUndo: () => void;
  handleManualSubmit: () => void;
  isSubmitDisabled: boolean;
  isBoosterEnabled: boolean;
  setIsBoosterEnabled: (val: boolean) => void;
  isAutoCorrectEnabled: boolean;
  setIsAutoCorrectEnabled: (val: boolean) => void;
}

export function CorrectionSidebar({
  isProcessing,
  diffParts,
  handleUndo,
  handleManualSubmit,
  isSubmitDisabled,
  isBoosterEnabled,
  setIsBoosterEnabled,
  isAutoCorrectEnabled,
  setIsAutoCorrectEnabled,
}: CorrectionSidebarProps) {
  return (
    <aside className={styles.sidebarContainer}>
      <h2 className={styles.title}>Actions</h2>
      <div className={styles.separator} />

      <div className={styles.actionSection}>
        <div className={styles.toggleContainer}>
          <label className={styles.toggleLabel}>
            <span className={styles.toggleText}>Booster (Mode Pro)</span>
            <div className={styles.toggleWrapper}>
              <input
                type="checkbox"
                className={styles.toggleCheckbox}
                checked={isBoosterEnabled}
                onChange={(e) => setIsBoosterEnabled(e.target.checked)}
                disabled={isProcessing}
              />
              <div className={styles.toggleSlider}></div>
            </div>
          </label>
        </div>

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
      </div>

      {diffParts && !isProcessing && (
        <div className={styles.diffViewer}>
          <div className={styles.diffHeader}>
            <span className={styles.diffTitle}>Changements détectés</span>
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
