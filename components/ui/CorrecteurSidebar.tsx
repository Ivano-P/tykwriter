'use client';

import * as Diff from 'diff';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import styles from './CorrectionSidebar.module.css'; // On réutilise ce CSS pour l'instant
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
  ignoreCorrection: (issue: CorrectionIssue) => void;
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
  ignoreCorrection,
}: CorrecteurSidebarProps) {

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
          onClick={handleManualSubmit}
          disabled={isSubmitDisabled}
          className={styles.submitButton}
        >
          {isProcessing ? 'Vérification...' : "Vérifier maintenant"}
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

      <div className="mt-4 flex flex-col gap-2 overflow-y-auto pr-2 flex-1 min-h-0">
        {correctionIssues.length > 0 && !isProcessing && (
        <div className={styles.diffHeader}>
            <span className={styles.diffTitle}>Erreurs détectées</span>
          </div>
        )}

        {correctionIssues.length === 0 && !isProcessing && (
          <div className="p-3 text-center text-[var(--tyk-sapphire)] font-medium text-sm">
            Aucune erreur détectées
          </div>
        )}
        {correctionIssues.map((issue, index) => (
          <div 
            key={index} 
            className="relative p-3 border rounded-md hover:bg-slate-50 transition-colors text-sm group"
          >
            <div className="cursor-pointer pb-2" onClick={() => applyCorrection(issue)}>
              <span className="text-[var(--destructive)] font-medium line-through">{issue.texte_original}</span>
              {' → '}
              <span className="text-[var(--tyk-sapphire)] font-bold">{issue.correction}</span>
              <div className="text-gray-500 mt-1">{issue.explication}</div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); ignoreCorrection(issue); }}
              className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
              title="Ignorer cette erreur"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      

    </aside>
  );
}
