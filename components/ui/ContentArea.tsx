'use client';

import { Copy, Undo2, Redo2 } from 'lucide-react';
import styles from './ContentArea.module.css';
import { TiptapEditor } from '@/components/ui/TiptapEditor';

interface ContentAreaProps {
  currentMode: "correcteur" | "maitre-redacteur" | "traduction";
  text: string;
  onChange: (val: string) => void;
  isProcessing: boolean;
  undoStackLength: number;
  redoStackLength: number;
  handleUndo: () => void;
  handleRedo: () => void;
  MAX_CHARS: number;
}

export function ContentArea({
  currentMode,
  text,
  onChange,
  isProcessing,
  undoStackLength,
  redoStackLength,
  handleUndo,
  handleRedo,
  MAX_CHARS,
}: ContentAreaProps) {

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const modeTitle = currentMode === "correcteur"
    ? "Correcteur"
    : currentMode === "maitre-redacteur"
      ? "Maître Rédacteur"
      : "Traduction";

  return (
    <div className={styles.contentContainer}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button
            className={styles.toolbarButton}
            onClick={handleUndo}
            disabled={undoStackLength === 0 || isProcessing || currentMode === 'traduction'}
            title="Annuler (Undo)"
          >
            <Undo2 size={24} />
          </button>
          <button
            className={styles.toolbarButton}
            onClick={handleRedo}
            disabled={redoStackLength === 0 || isProcessing || currentMode === 'traduction'}
            title="Rétablir (Redo)"
          >
            <Redo2 size={24} />
          </button>
        </div>

        <div className={styles.toolbarCenter}>
          <h2 className={styles.modeTitle}>{modeTitle}</h2>
        </div>

        <div className={styles.toolbarRight}>
          <button
            className={styles.toolbarButton}
            onClick={handleCopy}
            disabled={text.length === 0 || currentMode === 'traduction'}
            title="Copier le texte"
          >
            <Copy size={18} />
            <span className={styles.toolbarButtonText}>Copier</span>
          </button>
        </div>
      </div>

      {currentMode === 'traduction' ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 min-h-[400px] text-lg font-medium">
          Mode traduction (Bientôt disponible)
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-[400px]">
          <TiptapEditor
            globalText={text}
            setGlobalText={onChange}
            isProcessing={isProcessing}
            maxLength={MAX_CHARS}
            className={styles.textArea}
          />
        </div>
      )}

      <div className={styles.submitContainer}>
        <div className={styles.footerStats}>
          <div className={`${styles.charCount} ${text.length >= MAX_CHARS ? styles.charCountWarning : ''}`}>
            {text.length} / {MAX_CHARS} char
          </div>
          <div className={styles.wordCount}>
            {text.trim() === '' ? 0 : text.trim().split(/\s+/).length} mots
          </div>
        </div>
      </div>
    </div>
  );
}
