'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PanelLeft } from 'lucide-react';
import type { FolderMeta, NoteFull, NoteMeta } from '@/services/NoteService';
import {
  createFolderAction,
  createNoteAction,
  deleteFolderAction,
  deleteNoteAction,
  getNoteAction,
  renameFolderAction,
  updateNoteAction,
} from '@/actions/notes.action';
import { NotesSidebar } from './NotesSidebar';
import { NoteEditor } from './NoteEditor';
import styles from './NotesWorkspace.module.css';

export type SaveState = 'idle' | 'saving' | 'saved';

const AUTOSAVE_DELAY_MS = 800;

interface Props {
  initialFolders: FolderMeta[];
  initialNotes: NoteMeta[];
}

export function NotesWorkspace({ initialFolders, initialNotes }: Props) {
  const t = useTranslations('notes');
  const [folders, setFolders] = useState<FolderMeta[]>(initialFolders);
  const [notes, setNotes] = useState<NoteMeta[]>(initialNotes);
  const [openNote, setOpenNote] = useState<NoteFull | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Dernières modifications non enregistrées de la note ouverte.
  const pendingRef = useRef<{ title?: string; content?: Record<string, unknown> }>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openNoteIdRef = useRef<string | null>(null);
  const openNoteId = openNote?.id ?? null;
  useEffect(() => {
    openNoteIdRef.current = openNoteId;
  }, [openNoteId]);

  /** Écrit immédiatement les modifs en attente (fin de debounce ou changement de note). */
  const flushSave = useCallback(async (noteId: string) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const pending = pendingRef.current;
    if (pending.title === undefined && pending.content === undefined) return;
    pendingRef.current = {};

    setSaveState('saving');
    // Contenu envoyé en chaîne JSON (voir NoteUpdatePayload).
    const updated = await updateNoteAction(noteId, {
      title: pending.title,
      contentJson:
        pending.content !== undefined
          ? JSON.stringify(pending.content)
          : undefined,
    });
    setSaveState('saved');
    if (updated) {
      setNotes((prev) => {
        const rest = prev.filter((n) => n.id !== updated.id);
        // La note modifiée remonte en tête (tri par dernière modification).
        return [updated, ...rest];
      });
    }
  }, []);

  const scheduleSave = useCallback(
    (noteId: string, change: { title?: string; content?: Record<string, unknown> }) => {
      pendingRef.current = { ...pendingRef.current, ...change };
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void flushSave(noteId);
      }, AUTOSAVE_DELAY_MS);
    },
    [flushSave],
  );

  // Sauvegarde de secours si l'utilisateur quitte la page pendant le debounce.
  useEffect(() => {
    const handleBeforeUnload = () => {
      const id = openNoteIdRef.current;
      if (id) void flushSave(id);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [flushSave]);


  const selectNote = useCallback(
    async (id: string) => {
      const previousId = openNoteIdRef.current;
      if (previousId && previousId !== id) {
        await flushSave(previousId);
      }
      const full = await getNoteAction(id);
      if (full) {
        setOpenNote(full);
        setSaveState('idle');
        setIsSidebarOpen(false);
      }
    },
    [flushSave],
  );

  // Ouverture d'une note via un lien inter-notes (chip @ dans l'éditeur).
  useEffect(() => {
    const handleOpenNote = (event: Event) => {
      const noteId = (event as CustomEvent<string>).detail;
      if (typeof noteId === 'string' && noteId) void selectNote(noteId);
    };
    document.addEventListener('tykwriter:open-note', handleOpenNote);
    return () =>
      document.removeEventListener('tykwriter:open-note', handleOpenNote);
  }, [selectNote]);

  const handleCreateNote = useCallback(
    async (folderId: string | null) => {
      const previousId = openNoteIdRef.current;
      if (previousId) await flushSave(previousId);
      const created = await createNoteAction(folderId);
      setNotes((prev) => [created, ...prev]);
      setOpenNote({ ...created, content: null });
      setSaveState('idle');
      setIsSidebarOpen(false);
    },
    [flushSave],
  );

  const handleDeleteNote = useCallback(
    async (id: string) => {
      if (!window.confirm(t('confirmDeleteNote'))) return;
      await deleteNoteAction(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (openNoteIdRef.current === id) {
        pendingRef.current = {};
        setOpenNote(null);
      }
    },
    [t],
  );

  const handleCreateFolder = useCallback(async (name: string) => {
    const created = await createFolderAction(name);
    setFolders((prev) => [...prev, created]);
  }, []);

  const handleRenameFolder = useCallback(async (id: string, name: string) => {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
    await renameFolderAction(id, name);
  }, []);

  const handleDeleteFolder = useCallback(
    async (id: string) => {
      if (!window.confirm(t('confirmDeleteFolder'))) return;
      await deleteFolderAction(id);
      setFolders((prev) => prev.filter((f) => f.id !== id));
      // Les notes du dossier reviennent à la racine (miroir du FK set null).
      setNotes((prev) =>
        prev.map((n) => (n.folderId === id ? { ...n, folderId: null } : n)),
      );
      setOpenNote((prev) =>
        prev && prev.folderId === id ? { ...prev, folderId: null } : prev,
      );
    },
    [t],
  );

  const handleTitleChange = useCallback(
    (title: string) => {
      const id = openNoteIdRef.current;
      if (!id) return;
      setOpenNote((prev) => (prev ? { ...prev, title } : prev));
      // Mise à jour immédiate du titre dans la sidebar (sans attendre le save).
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, title } : n)));
      scheduleSave(id, { title });
    },
    [scheduleSave],
  );

  const handleContentChange = useCallback(
    (content: Record<string, unknown>) => {
      const id = openNoteIdRef.current;
      if (!id) return;
      scheduleSave(id, { content });
    },
    [scheduleSave],
  );

  const handleMoveToFolder = useCallback(async (folderId: string | null) => {
    const id = openNoteIdRef.current;
    if (!id) return;
    setOpenNote((prev) => (prev ? { ...prev, folderId } : prev));
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, folderId } : n)));
    await updateNoteAction(id, { folderId });
  }, []);

  return (
    <div className={styles.workspace}>
      <button
        className={styles.sidebarToggle}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label={isSidebarOpen ? t('closeSidebar') : t('openSidebar')}
      >
        <PanelLeft size={20} />
      </button>

      <div
        className={`${styles.sidebarPane} ${isSidebarOpen ? styles.sidebarPaneOpen : ''}`}
      >
        <NotesSidebar
          folders={folders}
          notes={notes}
          selectedNoteId={openNote?.id ?? null}
          onSelectNote={selectNote}
          onCreateNote={handleCreateNote}
          onDeleteNote={handleDeleteNote}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
        />
      </div>

      <div className={styles.editorPane}>
        {openNote ? (
          <NoteEditor
            key={openNote.id}
            note={openNote}
            folders={folders}
            notes={notes}
            saveState={saveState}
            onTitleChange={handleTitleChange}
            onContentChange={handleContentChange}
            onMoveToFolder={handleMoveToFolder}
          />
        ) : (
          <div className={styles.emptyState}>
            <p>{t('selectNote')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
