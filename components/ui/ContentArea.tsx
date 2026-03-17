'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Copy, Undo2, Redo2, ChevronDown, Trash2 } from 'lucide-react';
import styles from './ContentArea.module.css';
import { TiptapEditor } from '@/components/ui/TiptapEditor';
import { CorrectionIssue } from '@/services/MistralAiProService';

type Mode = "correcteur" | "assistant-redacteur" | "traduction";

interface ContentAreaProps {
  currentMode: Mode;
  text: string;
  onChange: (val: string) => void;
  isProcessing: boolean;
  undoStackLength: number;
  redoStackLength: number;
  handleUndo: () => void;
  handleRedo: () => void;
  MAX_CHARS: number;
  correctionIssues?: CorrectionIssue[];
  applyCorrection?: (issue: CorrectionIssue, source: 'sidebar' | 'editor') => void;
  ignoreCorrection?: (issue: CorrectionIssue) => void;
  isSnLinkEnabled?: boolean;
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
  correctionIssues,
  applyCorrection,
  ignoreCorrection,
  isSnLinkEnabled,
}: ContentAreaProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

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
      window.dispatchEvent(new CustomEvent('tyk:copyAll'));
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
                <Link
                  href="/correcteur"
                  className={`${styles.modeDropdownItem} ${pathname === '/correcteur' ? styles.modeDropdownItemActive : ''}`}
                  onClick={() => setIsDropdownOpen(false)}
                >
                  Correcteur
                </Link>
                <Link
                  href="/assistant-redacteur"
                  className={`${styles.modeDropdownItem} ${pathname === '/assistant-redacteur' ? styles.modeDropdownItemActive : ''}`}
                  onClick={() => setIsDropdownOpen(false)}
                >
                  Assistant Rédacteur
                </Link>
                {/* <Link
                  href="/traduction"
                  className={`${styles.modeDropdownItem} ${pathname === '/traduction' ? styles.modeDropdownItemActive : ''}`}
                  onClick={() => setIsDropdownOpen(false)}
                >
                  Traduction
                </Link> */}
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
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', minHeight: '400px', fontSize: '1.125rem', fontWeight: 500 }}>
          Mode traduction (Bientôt disponible)
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
          <TiptapEditor
            globalText={text}
            setGlobalText={onChange}
            isProcessing={isProcessing}
            maxLength={MAX_CHARS}
            className={styles.textArea}
            correctionIssues={correctionIssues}
            applyCorrection={applyCorrection}
            ignoreCorrection={ignoreCorrection}
            isSnLinkEnabled={isSnLinkEnabled}
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
