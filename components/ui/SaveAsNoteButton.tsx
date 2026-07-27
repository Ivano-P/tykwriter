'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { NotebookPen } from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import { saveTextAsNoteAction } from '@/actions/notes.action';
import styles from './SaveAsNoteButton.module.css';

interface Props {
  /** Texte à enregistrer (contenu corrigé / traduit). */
  text: string;
  /** Suffixe du titre, déjà localisé (ex : « correcteur », « traducteur français -> anglais »). */
  modeLabel: string;
}

/**
 * « Enregistrer en note » : crée une nouvelle note titrée
 * `JJ/MM/AAAA HH:mm:ss - <mode>` avec le texte courant.
 * Masqué pour les utilisateurs non connectés (pas de notes sans compte).
 */
export function SaveAsNoteButton({ text, modeLabel }: Props) {
  const t = useTranslations('saveAsNote');
  const { data: session } = useSession();
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  );

  if (!session) return null;

  const disabled = state === 'saving' || !text.trim();

  const save = async () => {
    if (disabled) return;
    setState('saving');
    try {
      const pad = (n: number) => String(n).padStart(2, '0');
      const d = new Date();
      const title = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} - ${modeLabel}`;
      await saveTextAsNoteAction(title, text);
      setState('saved');
      setTimeout(() => setState('idle'), 2500);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3500);
    }
  };

  return (
    <button
      className={`${styles.button} ${state === 'saved' ? styles.buttonSaved : ''} ${state === 'error' ? styles.buttonError : ''}`}
      onClick={save}
      disabled={disabled}
      title={t('button')}
    >
      <NotebookPen size={16} />
      <span>
        {state === 'saving' && t('saving')}
        {state === 'saved' && t('saved')}
        {state === 'error' && t('error')}
        {state === 'idle' && t('button')}
      </span>
    </button>
  );
}
