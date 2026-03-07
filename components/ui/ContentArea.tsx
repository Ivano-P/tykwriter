'use client';

import { Textarea } from '@/components/ui/textarea';
import { Copy, Undo2, Redo2 } from 'lucide-react';
import styles from './ContentArea.module.css';

interface ContentAreaProps {
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
  text,
  onChange,
  isProcessing,
  undoStackLength,
  redoStackLength,
  handleUndo,
  handleRedo,
  MAX_CHARS,
}: ContentAreaProps) {

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  return (
    <div className={styles.contentContainer}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button
            className={styles.toolbarButton}
            onClick={handleUndo}
            disabled={undoStackLength === 0 || isProcessing}
            title="Annuler (Undo)"
          >
            <Undo2 size={24} />
          </button>
          <button
            className={styles.toolbarButton}
            onClick={handleRedo}
            disabled={redoStackLength === 0 || isProcessing}
            title="Rétablir (Redo)"
          >
            <Redo2 size={24} />
          </button>
        </div>

        <div className={styles.toolbarCenter}>
          <h2 className={styles.modeTitle}>Correcteur</h2>
        </div>

        <div className={styles.toolbarRight}>
          <button
            className={styles.toolbarButton}
            onClick={handleCopy}
            disabled={text.length === 0}
            title="Copier le texte"
          >
            <Copy size={18} />
            <span className={styles.toolbarButtonText}>Copier</span>
          </button>
        </div>
      </div>

      <Textarea
        placeholder="je tape ici."
        className={styles.textArea}
        value={text}
        onChange={handleChange}
        disabled={isProcessing}
        maxLength={MAX_CHARS}
      />

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
