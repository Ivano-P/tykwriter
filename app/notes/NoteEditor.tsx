'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
import { GripVertical, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { FolderMeta, NoteFull, NoteMeta } from '@/services/NoteService';
import { createImageUploadAction } from '@/actions/storage.action';
import type { SaveState } from './NotesWorkspace';
import { buildNoteExtensions } from './editor/extensions';
import { NoteLinkCommand, SlashCommand } from './editor/SlashCommand';
import {
  createNoteLinkSuggestion,
  createSlashSuggestion,
} from './editor/slashSuggestion';
import { EditorBubbleMenu } from './editor/EditorBubbleMenu';
import { NotesAiPanel } from './NotesAiPanel';
import styles from './NoteEditor.module.css';

interface Props {
  note: NoteFull;
  folders: FolderMeta[];
  notes: NoteMeta[];
  saveState: SaveState;
  onTitleChange: (title: string) => void;
  onContentChange: (content: Record<string, unknown>) => void;
  onMoveToFolder: (folderId: string | null) => void;
}

export function NoteEditor({
  note,
  folders,
  notes,
  saveState,
  onTitleChange,
  onContentChange,
  onMoveToFolder,
}: Props) {
  const t = useTranslations('notes');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'error'>(
    'idle',
  );
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);

  // Les handlers paste/drop sont capturés à la création de l'éditeur ;
  // on passe par une ref pour appeler la version courante.
  const uploadRef = useRef<(files: File[], pos?: number) => void>(() => {});

  // Liste des notes lue par le menu « @ » (ref : la config d'extension est
  // figée à la création de l'éditeur, la liste évolue).
  const notesRef = useRef<NoteMeta[]>(notes);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

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
          toggleH1: t('slashToggleH1'),
          toggleH2: t('slashToggleH2'),
          toggleH3: t('slashToggleH3'),
          quote: t('slashQuote'),
          codeBlock: t('slashCodeBlock'),
          table: t('slashTable'),
          divider: t('slashDivider'),
          image: t('slashImage'),
          noteLink: t('slashNoteLink'),
        }),
      }),
      NoteLinkCommand.configure({
        suggestion: createNoteLinkSuggestion(
          () => notesRef.current.filter((n) => n.id !== note.id),
          { group: t('noteLinkGroup'), untitled: t('untitled') },
        ),
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
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
          f.type.startsWith('image/'),
        );
        if (files.length === 0) return false;
        event.preventDefault();
        uploadRef.current(files);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
          f.type.startsWith('image/'),
        );
        if (files.length === 0) return false;
        event.preventDefault();
        const pos = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        })?.pos;
        uploadRef.current(files, pos);
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      onContentChange(editor.getJSON() as Record<string, unknown>);
    },
  });

  const uploadImages = useCallback(
    async (files: File[], pos?: number) => {
      if (!editor) return;
      setUploadState('uploading');
      let failed = false;
      for (const file of files) {
        try {
          const ticket = await createImageUploadAction(
            note.id,
            file.type,
            file.size,
          );
          const res = await fetch(ticket.uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          });
          if (!res.ok) throw new Error('UPLOAD_FAILED');
          const imageNode = { type: 'image', attrs: { src: ticket.publicUrl } };
          if (pos !== undefined) {
            editor.chain().focus().insertContentAt(pos, imageNode).run();
          } else {
            editor.chain().focus().insertContent(imageNode).run();
          }
        } catch {
          failed = true;
        }
      }
      setUploadState(failed ? 'error' : 'idle');
    },
    [editor, note.id],
  );

  useEffect(() => {
    uploadRef.current = (files, pos) => {
      void uploadImages(files, pos);
    };
  }, [uploadImages]);

  // Ouverture du sélecteur de fichier depuis la commande « /image ».
  useEffect(() => {
    const openPicker = () => fileInputRef.current?.click();
    document.addEventListener('tykwriter:pick-image', openPicker);
    return () => document.removeEventListener('tykwriter:pick-image', openPicker);
  }, []);

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
            className={`${styles.saveIndicator} ${saveState === 'saving' || uploadState === 'uploading' ? styles.saveIndicatorActive : ''} ${uploadState === 'error' ? styles.saveIndicatorError : ''}`}
          >
            {uploadState === 'uploading' && t('uploadingImage')}
            {uploadState === 'error' && t('imageUploadError')}
            {uploadState === 'idle' && saveState === 'saving' && t('saving')}
            {uploadState === 'idle' && saveState === 'saved' && t('saved')}
          </span>
          <button
            className={`${styles.aiToggle} ${isAiPanelOpen ? styles.aiToggleActive : ''}`}
            onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
            aria-label={t('aiPanelTitle')}
            title={t('aiPanelTitle')}
          >
            <Sparkles size={16} />
            <span>{t('aiPanelToggle')}</span>
          </button>
        </div>
      </div>

      {editor && <EditorBubbleMenu editor={editor} />}
      {/* Poignée de déplacement des blocs (à droite, glisser-déposer). */}
      {editor && (
        <DragHandle
          editor={editor}
          computePositionConfig={{ placement: 'right-start' }}
        >
          <div className={styles.dragHandle}>
            <GripVertical size={16} />
          </div>
        </DragHandle>
      )}
      {/* Clic sur un chip de lien inter-notes : ouvre la note cible
          (listener React sur le wrapper — plus fiable que handleClick PM
          pour les nodes atomiques). */}
      <EditorContent
        editor={editor}
        className={styles.content}
        onClick={(e) => {
          const link = (e.target as HTMLElement).closest?.('[data-note-link]');
          const noteId = link?.getAttribute('data-note-id');
          if (noteId) {
            document.dispatchEvent(
              new CustomEvent('tykwriter:open-note', { detail: noteId }),
            );
          }
        }}
      />
      {editor && isAiPanelOpen && (
        <NotesAiPanel editor={editor} onClose={() => setIsAiPanelOpen(false)} />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length > 0) void uploadImages(files);
        }}
      />
    </div>
  );
}
