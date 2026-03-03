'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { spellcheckAction } from '@/actions/spellcheck.action';
import * as Diff from 'diff';
import { Copy, Undo2, Redo2 } from 'lucide-react';
import Image from 'next/image';
import styles from './ContentArea.module.css';

export function ContentArea() {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [diffParts, setDiffParts] = useState<Diff.Change[] | null>(null);

  const MAX_CHARS = 2000;

  // Track if we should skip debounce (e.g. after undo/redo/spellcheck)
  const skipDebounceRef = useRef(false);

  useEffect(() => {
    // Debounce logic
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return;
    }

    if (text.trim() === '' || isProcessing || text.length > MAX_CHARS) {
      return;
    }

    const timer = setTimeout(() => {
      handleSpellCheck(text);
    }, 2500);

    return () => clearTimeout(timer);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSpellCheck = async (textToCheck: string) => {
    if (!textToCheck.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      const result = await spellcheckAction(textToCheck);

      if (result !== textToCheck) {
        // Calculate diff before replacing text
        const calculatedDiff = Diff.diffWords(textToCheck, result);
        setDiffParts(calculatedDiff);

        // Push old text to undo stack, clear redo
        setUndoStack((prev: string[]) => [...prev, textToCheck]);
        setRedoStack([]);

        // Update text with corrected text
        skipDebounceRef.current = true;
        setText(result);
      } else {
        setDiffParts(null); // Clear diff if no changes
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= MAX_CHARS) {
      setText(val);
      setDiffParts(null);
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || isProcessing) return;
    const lastText = undoStack[undoStack.length - 1];

    setRedoStack((prev: string[]) => [...prev, text]);
    setUndoStack((prev: string[]) => prev.slice(0, -1));

    skipDebounceRef.current = true;
    setText(lastText);
    setDiffParts(null); // Clear diff on manual undo/redo
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || isProcessing) return;
    const nextText = redoStack[redoStack.length - 1];

    setUndoStack((prev: string[]) => [...prev, text]);
    setRedoStack((prev: string[]) => prev.slice(0, -1));

    skipDebounceRef.current = true;
    setText(nextText);
    setDiffParts(null);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleManualSubmit = () => {
    skipDebounceRef.current = true;
    handleSpellCheck(text);
  };

  return (
    <div className={styles.contentContainer}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button
            className={styles.toolbarButton}
            onClick={handleUndo}
            disabled={undoStack.length === 0 || isProcessing}
            title="Annuler (Undo)"
          >
            <Undo2 size={24} />
          </button>
          <button
            className={styles.toolbarButton}
            onClick={handleRedo}
            disabled={redoStack.length === 0 || isProcessing}
            title="Rétablir (Redo)"
          >
            <Redo2 size={24} />
          </button>
        </div>
        <div className={styles.toolbarCenter}>
          <Image
            src="/images/tykwriter_logo.png"
            alt="Tykwriter Logo"
            width={160}
            height={42}
            className={styles.toolbarLogo}
            priority
          />
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
        placeholder="Tapez votre texte ici..."
        className={styles.textArea}
        value={text}
        onChange={handleChange}
        disabled={isProcessing}
        maxLength={MAX_CHARS}
      />

      <div className={styles.footerInfo}>
        <div className={`${styles.charCount} ${text.length >= MAX_CHARS ? styles.charCountWarning : ''}`}>
          {text.length} / {MAX_CHARS}
        </div>
      </div>

      {isProcessing && (
        <div className={styles.processingIndicator}>
          <span>IA en cours d&apos;analyse...</span>
        </div>
      )}

      {diffParts && !isProcessing && (
        <div className={styles.diffViewer}>
          <div className={styles.diffHeader}>
            <span className={styles.diffTitle}>Changements détectés :</span>
            <button className={styles.undoButton} onClick={handleUndo}>
              Annuler la correction
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

      <div className={styles.submitContainer}>
        <Button
          onClick={handleManualSubmit}
          disabled={isProcessing || !text.trim() || text.length > MAX_CHARS}
          className={styles.submitButton}
        >
          {isProcessing ? 'Vérification...' : "Vérifier maintenant"}
        </Button>
      </div>
    </div>
  );
}
