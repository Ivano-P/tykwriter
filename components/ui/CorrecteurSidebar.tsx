'use client';

import { useState } from 'react';
import * as Diff from 'diff';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import styles from './CorrectionSidebar.module.css'; // On réutilise ce CSS pour l'instant
import { checkSpellingIssuesAction } from '@/actions/spellcheck.action';
import { CorrectionIssue } from '@/services/MistralAiProService';

interface CorrecteurSidebarProps {
  isProcessing: boolean;
  diffParts: Diff.Change[] | null;
  handleUndo: () => void;
  handleManualSubmit: () => void;
  isSubmitDisabled: boolean;
  isAutoCorrectEnabled: boolean;
  setIsAutoCorrectEnabled: (val: boolean) => void;
  globalText: string;
  correctionIssues: CorrectionIssue[];
  setCorrectionIssues: (issues: CorrectionIssue[]) => void;
  applyCorrection: (issue: CorrectionIssue) => void;
  applyAllCorrections: () => void;
}

export function CorrecteurSidebar({
  isProcessing,
  diffParts,
  handleUndo,
  handleManualSubmit,
  isSubmitDisabled,
  isAutoCorrectEnabled,
  setIsAutoCorrectEnabled,
  globalText,
  correctionIssues,
  setCorrectionIssues,
  applyCorrection,
  applyAllCorrections,
}: CorrecteurSidebarProps) {
  const [isLoading, setIsLoading] = useState(false);

  const onVerifyClick = async () => {
    if (!globalText.trim() || isLoading) return;
    setIsLoading(true);
    setCorrectionIssues([]);
    try {
      const response = await checkSpellingIssuesAction(globalText);
      if (response && response.erreurs) {
        setCorrectionIssues(response.erreurs);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside className={styles.sidebarContainer}>
      <h2 className={styles.title}>Actions</h2>
      <div className={styles.separator} />

      <div className={styles.actionSection}>
        <div className={styles.toggleContainer}>
          <label className={styles.toggleLabel}>
            <span className={styles.toggleText}>Vérification automatique</span>
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
          onClick={onVerifyClick}
          disabled={isSubmitDisabled || isLoading}
          className={styles.submitButton}
        >
          {isLoading ? 'Vérification...' : "Vérifier maintenant"}
        </Button>
        {correctionIssues.length > 0 && (
          <Button
            onClick={applyAllCorrections}
            variant="outline"
            className="w-full mt-2 border-[var(--tyk-sapphire)] text-[var(--tyk-sapphire)] hover:bg-[var(--tyk-sapphire)] hover:text-white transition-colors"
          >
            Tout corriger ({correctionIssues.length})
          </Button>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 overflow-y-auto pr-2">
        {correctionIssues.map((issue, index) => (
          <div 
            key={index} 
            onClick={() => applyCorrection(issue)}
            className="p-3 border rounded-md cursor-pointer hover:bg-slate-50 transition-colors text-sm"
          >
            <span className="text-[var(--destructive)] font-medium line-through">{issue.texte_original}</span>
            {' -> '}
            <span className="text-[var(--tyk-sapphire)] font-bold">{issue.correction}</span>
            {' - '}
            <span className="text-gray-500">{issue.explication}</span>
          </div>
        ))}
      </div>

      {diffParts && !isProcessing && correctionIssues.length === 0 && (
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
