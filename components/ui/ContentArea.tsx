'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Copy, Undo2, Redo2, ChevronDown, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
  isLinkEnabled?: boolean;
  /** Panneau de sortie affiché à côté de l'éditeur (mode traduction : zone scindée). */
  translationPane?: React.ReactNode;
  /** En-tête du panneau SOURCE (mode traduction : bouton Copier symétrique). */
  sourcePaneHeader?: React.ReactNode;
  /** Sélecteur de langue du mode (affiché entre Rétablir et le nom du mode). */
  languageOptions?: { value: string; label: string }[];
  languageValue?: string;
  onLanguageChange?: (value: string) => void;
  /** Sélecteur de langue CIBLE (traduction) : entre le nom du mode et Supprimer. */
  targetLanguageOptions?: { value: string; label: string }[];
  targetLanguageValue?: string;
  onTargetLanguageChange?: (value: string) => void;
  targetLanguageTitle?: string;
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
  isLinkEnabled,
  translationPane,
  sourcePaneHeader,
  languageOptions,
  languageValue,
  onLanguageChange,
  targetLanguageOptions,
  targetLanguageValue,
  onTargetLanguageChange,
  targetLanguageTitle,
}: ContentAreaProps) {
  const t = useTranslations('contentArea');
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
    if (confirm(t('confirmDelete'))) {
      onChange('');
    }
  };

  const modeTitle = currentMode === "correcteur"
    ? t('modeCorrecteur')
    : currentMode === "assistant-redacteur"
      ? t('modeAssistant')
      : t('modeTraduction');

  return (
    <div className={styles.contentContainer}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button
            className={styles.toolbarButton}
            onClick={handleUndo}
            disabled={undoStackLength === 0 || isProcessing || currentMode === 'traduction'}
            title={t('undoTitle')}
          >
            <Undo2 size={24} />
          </button>
          <button
            className={styles.toolbarButton}
            onClick={handleRedo}
            disabled={redoStackLength === 0 || isProcessing || currentMode === 'traduction'}
            title={t('redoTitle')}
          >
            <Redo2 size={24} />
          </button>

          {languageOptions && languageOptions.length > 0 && onLanguageChange && (
            <select
              className={styles.toolbarSelect}
              value={languageValue}
              onChange={(e) => onLanguageChange(e.target.value)}
              title={t('languageTitle')}
              aria-label={t('languageTitle')}
            >
              {languageOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
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
                  {t('modeCorrecteur')}
                </Link>
                <Link
                  href="/assistant-redacteur"
                  className={`${styles.modeDropdownItem} ${pathname === '/assistant-redacteur' ? styles.modeDropdownItemActive : ''}`}
                  onClick={() => setIsDropdownOpen(false)}
                >
                  {t('modeAssistant')}
                </Link>
                <Link
                  href="/traduction"
                  className={`${styles.modeDropdownItem} ${pathname === '/traduction' ? styles.modeDropdownItemActive : ''}`}
                  onClick={() => setIsDropdownOpen(false)}
                >
                  {t('modeTraduction')}
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className={styles.toolbarRight}>
          {targetLanguageOptions && targetLanguageOptions.length > 0 && onTargetLanguageChange && (
            <select
              className={styles.toolbarSelect}
              value={targetLanguageValue}
              onChange={(e) => onTargetLanguageChange(e.target.value)}
              title={targetLanguageTitle ?? t('languageTitle')}
              aria-label={targetLanguageTitle ?? t('languageTitle')}
            >
              {targetLanguageOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
          <button
            className={styles.toolbarButton}
            onClick={handleDelete}
            disabled={text.length === 0}
            title={t('deleteTitle')}
          >
            <Trash2 size={18} />
            <span className={styles.toolbarButtonText}>{t('delete')}</span>
          </button>
          {/* En traduction, chaque panneau a son propre bouton Copier symétrique */}
          {currentMode !== 'traduction' && (
            <button
              className={styles.toolbarButton}
              onClick={handleCopy}
              disabled={text.length === 0}
              title={t('copyTitle')}
            >
              <Copy size={18} />
              <span className={styles.toolbarButtonText}>{t('copy')}</span>
            </button>
          )}
        </div>
      </div>

      {currentMode === 'traduction' && translationPane ? (
        <div className={styles.splitContainer}>
          <div className={styles.splitPane}>
            {sourcePaneHeader}
            <TiptapEditor
              globalText={text}
              setGlobalText={onChange}
              isProcessing={false}
              maxLength={MAX_CHARS}
              className={styles.textArea}
            />
          </div>
          <div className={`${styles.splitPane} ${styles.splitPaneOutput}`}>
            {translationPane}
          </div>
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
            isLinkEnabled={isLinkEnabled}
          />
        </div>
      )}

      <div className={styles.submitContainer}>
        <div className={styles.footerStats}>
          <div className={`${styles.charCount} ${text.length >= MAX_CHARS ? styles.charCountWarning : ''}`}>
            {/* Valeurs passées en chaînes pour éviter le groupement ICU des milliers (2 000). */}
            {t('charCount', { current: String(text.length), max: String(MAX_CHARS) })}
          </div>
          <div className={styles.wordCount}>
            {t('wordCount', { count: String(text.trim() === '' ? 0 : text.trim().split(/\s+/).length) })}
          </div>
        </div>
      </div>
    </div>
  );
}
