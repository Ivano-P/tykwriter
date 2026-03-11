'use client';

import { useState, useRef, useEffect } from 'react';
import { Copy, Undo2, Redo2, ChevronDown, Trash2 } from 'lucide-react';
import styles from './ContentArea.module.css';
import { TiptapEditor } from '@/components/ui/TiptapEditor';

type Mode = "correcteur" | "assistant-redacteur" | "traduction";

interface ContentAreaProps {
  currentMode: Mode;
  setCurrentMode: (mode: Mode) => void;
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
  setCurrentMode,
  text,
  onChange,
  isProcessing,
  undoStackLength,
  redoStackLength,
  handleUndo,
  handleRedo,
  MAX_CHARS,
}: ContentAreaProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleDelete = () => {
    if (confirm('Voulez-vous vraiment supprimer tout le texte ?')) {
      onChange('');
    }
  };

  const modeTitle = currentMode === "correcteur"
    ? "Correcteur"
    : currentMode === "assistant-redacteur"
      ? "Assistant Rédacteur"
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

        <div className={styles.toolbarCenter} ref={dropdownRef}>
          <div className={styles.modeTitleWrapper}>
            <button
              className={styles.modeTitleButton}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              <span className={styles.modeTitleText}>{modeTitle}</span>
              <ChevronDown size={20} className={styles.modeTitleIcon} />
            </button>

            {isDropdownOpen && (
              <div className={styles.modeDropdownMenu}>
                <button
                  className={`${styles.modeDropdownItem} ${currentMode === 'correcteur' ? styles.modeDropdownItemActive : ''}`}
                  onClick={() => { setCurrentMode('correcteur'); setIsDropdownOpen(false); }}
                >
                  Correcteur
                </button>
                <button
                  className={`${styles.modeDropdownItem} ${currentMode === 'assistant-redacteur' ? styles.modeDropdownItemActive : ''}`}
                  onClick={() => { setCurrentMode('assistant-redacteur'); setIsDropdownOpen(false); }}
                >
                  Assistant Rédacteur
                </button>
                {/* <button
                  className={`${styles.modeDropdownItem} ${currentMode === 'traduction' ? styles.modeDropdownItemActive : ''}`}
                  onClick={() => { setCurrentMode('traduction'); setIsDropdownOpen(false); }}
                >
                  Traduction
                </button> */}
              </div>
            )}
          </div>
        </div>

        <div className={styles.toolbarRight}>
          <button
            className={styles.toolbarButton}
            onClick={handleDelete}
            disabled={text.length === 0 || currentMode === 'traduction'}
            title="Supprimer tout le texte"
          >
            <Trash2 size={18} />
            <span className={styles.toolbarButtonText}>Supprimer</span>
          </button>
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
