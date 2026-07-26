'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import {
  askNoteAction,
  restructureNoteAction,
  spellcheckSelectionAction,
  translateSelectionAction,
} from '@/actions/notesAi.action';
import { TARGET_LANGUAGES } from '@/services/prompts/traduction.prompt';
import styles from './NotesAiPanel.module.css';

interface Props {
  editor: Editor;
  onClose: () => void;
}

type Busy = 'ask' | 'restructure' | 'fix' | 'translate' | null;

/** Panneau IA de la note : Q&A, restructuration, correction/traduction de sélection. */
export function NotesAiPanel({ editor, onClose }: Props) {
  const t = useTranslations('notes');
  const locale = useLocale();

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState(
    locale === 'fr' ? 'en-US' : 'fr',
  );
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  const languageLabel = (() => {
    const display = new Intl.DisplayNames([locale], { type: 'language' });
    return (code: string) => display.of(code) ?? code;
  })();

  const run = async (kind: Exclude<Busy, null>, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(kind);
    setError(null);
    try {
      await fn();
    } catch {
      setError(t('aiError'));
    } finally {
      setBusy(null);
    }
  };

  const ask = () =>
    run('ask', async () => {
      const noteText = editor.getText();
      if (!noteText.trim() || !question.trim()) return;
      const { answer } = await askNoteAction(noteText, question.trim(), locale);
      setAnswer(answer);
    });

  const restructure = () =>
    run('restructure', async () => {
      if (!window.confirm(t('aiRestructureConfirm'))) return;
      const { html } = await restructureNoteAction(editor.getHTML(), locale);
      // emitUpdate: true → onUpdate → autosave.
      editor.commands.setContent(html, { emitUpdate: true });
    });

  /** Sélection courante, ou null si vide. */
  const selection = (): { from: number; to: number; text: string } | null => {
    const { from, to } = editor.state.selection;
    if (from === to) return null;
    const text = editor.state.doc.textBetween(from, to, '\n');
    return text.trim() ? { from, to, text } : null;
  };

  const replaceSelection = (from: number, to: number, text: string) => {
    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        tr.insertText(text, from, to);
        return true;
      })
      .run();
  };

  const fixSelection = () =>
    run('fix', async () => {
      const sel = selection();
      if (!sel) {
        setError(t('aiNoSelection'));
        return;
      }
      const { corrected } = await spellcheckSelectionAction(sel.text);
      replaceSelection(sel.from, sel.to, corrected);
    });

  const translateSelection = () =>
    run('translate', async () => {
      const sel = selection();
      if (!sel) {
        setError(t('aiNoSelection'));
        return;
      }
      const { translated, supported } = await translateSelectionAction(
        sel.text,
        targetLanguage,
      );
      if (!supported) {
        setError(t('aiUnsupportedLanguage'));
        return;
      }
      replaceSelection(sel.from, sel.to, translated);
    });

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t('aiPanelTitle')}</h2>
        <button className={styles.closeButton} onClick={onClose} aria-label={t('aiClose')}>
          <X size={18} />
        </button>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('aiAsk')}</h3>
        <textarea
          className={styles.questionInput}
          value={question}
          placeholder={t('aiQuestionPlaceholder')}
          rows={3}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button
          className={styles.actionButton}
          onClick={ask}
          disabled={busy !== null || !question.trim()}
        >
          {busy === 'ask' ? t('aiWorking') : t('aiAskButton')}
        </button>
        {answer && <div className={styles.answer}>{answer}</div>}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('aiNoteSection')}</h3>
        <button
          className={styles.actionButton}
          onClick={restructure}
          disabled={busy !== null}
        >
          {busy === 'restructure' ? t('aiWorking') : t('aiRestructure')}
        </button>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('aiSelection')}</h3>
        <button
          className={styles.actionButton}
          onMouseDown={(e) => e.preventDefault()}
          onClick={fixSelection}
          disabled={busy !== null}
        >
          {busy === 'fix' ? t('aiWorking') : t('aiFixSelection')}
        </button>
        <label className={styles.langRow}>
          <span className={styles.langLabel}>{t('aiTargetLanguage')}</span>
          <select
            className={styles.langSelect}
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
          >
            {TARGET_LANGUAGES.map((code) => (
              <option key={code} value={code}>
                {languageLabel(code)}
              </option>
            ))}
          </select>
        </label>
        <button
          className={styles.actionButton}
          onMouseDown={(e) => e.preventDefault()}
          onClick={translateSelection}
          disabled={busy !== null}
        >
          {busy === 'translate' ? t('aiWorking') : t('aiTranslateSelection')}
        </button>
      </section>

      {error && <p className={styles.error}>{error}</p>}
    </aside>
  );
}
