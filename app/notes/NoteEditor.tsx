'use client';

import { useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { useTranslations } from 'next-intl';
import type { FolderMeta, NoteFull } from '@/services/NoteService';
import type { SaveState } from './NotesWorkspace';
import { buildNoteExtensions } from './editor/extensions';
import { SlashCommand } from './editor/SlashCommand';
import { createSlashSuggestion } from './editor/slashSuggestion';
import { EditorBubbleMenu } from './editor/EditorBubbleMenu';
import styles from './NoteEditor.module.css';

interface Props {
  note: NoteFull;
  folders: FolderMeta[];
  saveState: SaveState;
  onTitleChange: (title: string) => void;
  onContentChange: (content: Record<string, unknown>) => void;
  onMoveToFolder: (folderId: string | null) => void;
}

export function NoteEditor({
  note,
  folders,
  saveState,
  onTitleChange,
  onContentChange,
  onMoveToFolder,
}: Props) {
  const t = useTranslations('notes');

  // Extensions stables pour la durée de vie de l'éditeur (une note = un éditeur).
  const extensions = useMemo(
    () => [
      ...buildNoteExtensions(t('editorPlaceholder')),
      SlashCommand.configure({
        suggestion: createSlashSuggestion({
          groups: {
            headings: t('slashGroupHeadings'),
            blocks: t('slashGroupBlocks'),
            inserts: t('slashGroupInserts'),
          },
          text: t('slashText'),
          h1: t('slashH1'),
          h2: t('slashH2'),
          h3: t('slashH3'),
          h4: t('slashH4'),
          h5: t('slashH5'),
          bulletList: t('slashBulletList'),
          orderedList: t('slashOrderedList'),
          taskList: t('slashTaskList'),
          toggle: t('slashToggle'),
          quote: t('slashQuote'),
          codeBlock: t('slashCodeBlock'),
          table: t('slashTable'),
          divider: t('slashDivider'),
        }),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const editor = useEditor({
    extensions,
    content: note.content ?? '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: styles.prosemirror,
      },
    },
    onUpdate: ({ editor }) => {
      onContentChange(editor.getJSON() as Record<string, unknown>);
    },
  });

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <input
          className={styles.titleInput}
          type="text"
          value={note.title}
          placeholder={t('titlePlaceholder')}
          onChange={(e) => onTitleChange(e.target.value)}
        />
        <div className={styles.headerMeta}>
          <label className={styles.folderSelectLabel}>
            {t('moveToFolder')}
            <select
              className={styles.folderSelect}
              value={note.folderId ?? ''}
              onChange={(e) => onMoveToFolder(e.target.value || null)}
            >
              <option value="">{t('rootFolder')}</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <span
            className={`${styles.saveIndicator} ${saveState === 'saving' ? styles.saveIndicatorActive : ''}`}
          >
            {saveState === 'saving' && t('saving')}
            {saveState === 'saved' && t('saved')}
          </span>
        </div>
      </div>

      {editor && <EditorBubbleMenu editor={editor} />}
      <EditorContent editor={editor} className={styles.content} />
    </div>
  );
}
