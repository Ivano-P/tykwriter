'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useTranslations } from 'next-intl';
import type { FolderMeta, NoteFull } from '@/services/NoteService';
import type { SaveState } from './NotesWorkspace';
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

  const editor = useEditor({
    extensions: [StarterKit],
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

      <EditorContent editor={editor} className={styles.content} />
    </div>
  );
}
