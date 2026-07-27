'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FolderPlus,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { FolderMeta, NoteMeta } from '@/services/NoteService';
import styles from './NotesSidebar.module.css';

interface Props {
  folders: FolderMeta[];
  notes: NoteMeta[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: (folderId: string | null) => void;
  onDeleteNote: (id: string) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
}

export function NotesSidebar({
  folders,
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: Props) {
  const t = useTranslations('notes');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [folderNameDraft, setFolderNameDraft] = useState('');

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => (n.title || t('untitled')).toLowerCase().includes(q));
  }, [notes, search, t]);

  const rootNotes = filteredNotes.filter((n) => n.folderId === null);
  const notesByFolder = useMemo(() => {
    const map = new Map<string, NoteMeta[]>();
    for (const n of filteredNotes) {
      if (!n.folderId) continue;
      const list = map.get(n.folderId) ?? [];
      list.push(n);
      map.set(n.folderId, list);
    }
    return map;
  }, [filteredNotes]);

  const toggleCollapsed = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const submitFolderName = () => {
    const name = folderNameDraft.trim();
    if (name) {
      if (editingFolderId) {
        onRenameFolder(editingFolderId, name);
      } else {
        onCreateFolder(name);
      }
    }
    setIsCreatingFolder(false);
    setEditingFolderId(null);
    setFolderNameDraft('');
  };

  const renderNote = (n: NoteMeta) => (
    <div
      key={n.id}
      className={`${styles.noteItem} ${n.id === selectedNoteId ? styles.noteItemActive : ''}`}
    >
      <button className={styles.noteTitle} onClick={() => onSelectNote(n.id)}>
        {n.title || t('untitled')}
      </button>
      <button
        className={styles.itemAction}
        onClick={() => onDeleteNote(n.id)}
        aria-label={t('deleteNote')}
        title={t('deleteNote')}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );

  const folderNameInput = (
    <input
      className={styles.folderNameInput}
      type="text"
      value={folderNameDraft}
      placeholder={t('folderNamePlaceholder')}
      autoFocus
      onChange={(e) => setFolderNameDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') submitFolderName();
        if (e.key === 'Escape') {
          setIsCreatingFolder(false);
          setEditingFolderId(null);
          setFolderNameDraft('');
        }
      }}
      onBlur={submitFolderName}
    />
  );

  return (
    <aside className={styles.sidebar}>
      <div className={styles.toolbar}>
        <input
          className={styles.search}
          type="search"
          value={search}
          placeholder={t('searchPlaceholder')}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className={styles.toolButton}
          onClick={() => onCreateNote(null)}
          aria-label={t('newNote')}
          title={t('newNote')}
        >
          <FilePlus2 size={18} />
        </button>
        <button
          className={styles.toolButton}
          onClick={() => {
            setEditingFolderId(null);
            setFolderNameDraft('');
            setIsCreatingFolder(true);
          }}
          aria-label={t('newFolder')}
          title={t('newFolder')}
        >
          <FolderPlus size={18} />
        </button>
      </div>

      <div className={styles.list}>
        {isCreatingFolder && !editingFolderId && folderNameInput}

        {folders.map((f) => {
          const isCollapsed = collapsed.has(f.id);
          const folderNotes = notesByFolder.get(f.id) ?? [];
          return (
            <div key={f.id} className={styles.folderBlock}>
              {editingFolderId === f.id ? (
                folderNameInput
              ) : (
                <div className={styles.folderRow}>
                  <button
                    className={styles.folderName}
                    onClick={() => toggleCollapsed(f.id)}
                  >
                    {isCollapsed ? (
                      <ChevronRight size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                    <span>{f.name}</span>
                    <span className={styles.folderCount}>{folderNotes.length}</span>
                  </button>
                  <button
                    className={styles.itemAction}
                    onClick={() => onCreateNote(f.id)}
                    aria-label={t('newNote')}
                    title={t('newNote')}
                  >
                    <FilePlus2 size={14} />
                  </button>
                  <button
                    className={styles.itemAction}
                    onClick={() => {
                      setIsCreatingFolder(false);
                      setEditingFolderId(f.id);
                      setFolderNameDraft(f.name);
                    }}
                    aria-label={t('renameFolder')}
                    title={t('renameFolder')}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className={styles.itemAction}
                    onClick={() => onDeleteFolder(f.id)}
                    aria-label={t('deleteFolder')}
                    title={t('deleteFolder')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
              {!isCollapsed && (
                <div className={styles.folderNotes}>{folderNotes.map(renderNote)}</div>
              )}
            </div>
          );
        })}

        <div className={styles.rootNotes}>{rootNotes.map(renderNote)}</div>

        {notes.length === 0 && <p className={styles.emptyText}>{t('empty')}</p>}
        {notes.length > 0 && filteredNotes.length === 0 && (
          <p className={styles.emptyText}>{t('noResults')}</p>
        )}
      </div>
    </aside>
  );
}
