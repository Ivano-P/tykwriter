'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Trash2, X } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import {
  askNoteAction,
  deleteNoteChatExchangeAction,
  getNoteChatAction,
  restructureNoteAction,
  spellcheckSelectionAction,
  translateSelectionAction,
} from '@/actions/notesAi.action';
import type { ChatExchange } from '@/services/NoteChatService';
import { TARGET_LANGUAGES } from '@/services/prompts/traduction.prompt';
import styles from './NotesAiPanel.module.css';

interface Props {
  editor: Editor;
  noteId: string;
  onClose: () => void;
}

type Busy = 'ask' | 'restructure' | 'fix' | 'translate' | null;

/** Panneau IA de la note : chat Q&A, restructuration, correction/traduction de sélection. */
export function NotesAiPanel({ editor, noteId, onClose }: Props) {
  const t = useTranslations('notes');
  const locale = useLocale();

  const [question, setQuestion] = useState('');
  const [exchanges, setExchanges] = useState<ChatExchange[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState(
    locale === 'fr' ? 'en-US' : 'fr',
  );
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  // Historique chargé à l'ouverture du panneau (purge 90 jours côté serveur).
  useEffect(() => {
    let cancelled = false;
    getNoteChatAction(noteId)
      .then(({ exchanges }) => {
        if (!cancelled) setExchanges(exchanges);
      })
       
      .catch((err) => console.error('Chargement du chat IA impossible :', err));
    return () => {
      cancelled = true;
    };
  }, [noteId]);

  // Défilement automatique vers le dernier message.
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: 'end' });
  }, [exchanges, pendingQuestion]);

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

  const ask = () => {
    const q = question.trim();
    const noteText = editor.getText();
    if (!q || !noteText.trim() || busy) return;
    setQuestion('');
    setPendingQuestion(q);
    void run('ask', async () => {
      const { exchange } = await askNoteAction(noteId, noteText, q, locale);
      setExchanges((prev) => [...prev, exchange]);
    }).finally(() => setPendingQuestion(null));
  };

  const deleteExchange = async (id: string) => {
    setExchanges((prev) => prev.filter((e) => e.id !== id));
    try {
      await deleteNoteChatExchangeAction(id);
    } catch {
      // Suppression échouée : l'échange réapparaîtra au prochain chargement.
    }
  };

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

      <section className={`${styles.section} ${styles.chatSection}`}>
        <h3 className={styles.sectionTitle}>{t('aiAsk')}</h3>

        <div className={styles.chatMessages}>
          {exchanges.length === 0 && !pendingQuestion && (
            <p className={styles.chatEmpty}>{t('aiChatEmpty')}</p>
          )}
          {exchanges.map((exchange) => (
            <div key={exchange.id} className={styles.chatExchange}>
              <div className={styles.chatQuestionRow}>
                <div className={styles.chatQuestion}>{exchange.question}</div>
                <button
                  className={styles.chatDelete}
                  onClick={() => deleteExchange(exchange.id)}
                  aria-label={t('aiDeleteExchange')}
                  title={t('aiDeleteExchange')}
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <div className={styles.chatAnswer}>{exchange.answer}</div>
            </div>
          ))}
          {pendingQuestion && (
            <div className={styles.chatExchange}>
              <div className={styles.chatQuestionRow}>
                <div className={styles.chatQuestion}>{pendingQuestion}</div>
              </div>
              <div className={`${styles.chatAnswer} ${styles.chatAnswerPending}`}>
                {t('aiWorking')}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <textarea
          className={styles.questionInput}
          value={question}
          placeholder={t('aiQuestionPlaceholder')}
          rows={2}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              ask();
            }
          }}
        />
        <button
          className={styles.actionButton}
          onClick={ask}
          disabled={busy !== null || !question.trim()}
        >
          {busy === 'ask' ? t('aiWorking') : t('aiAskButton')}
        </button>
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
