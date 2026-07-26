'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  NoteService,
  type FolderMeta,
  type NoteFull,
  type NoteMeta,
  type NoteUpdate,
} from '@/services/NoteService';

const TITLE_MAX = 300;
const FOLDER_NAME_MAX = 100;

/** Contrôleur notes : validation des entrées puis délégation au service. */

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session.user.id;
}

function assertId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || id.length === 0 || id.length > 64) {
    throw new Error('INVALID_ID');
  }
}

export async function getNoteAction(id: string): Promise<NoteFull | null> {
  const userId = await requireUserId();
  assertId(id);
  return NoteService.getNote(userId, id);
}

export async function createNoteAction(
  folderId: string | null,
): Promise<NoteMeta> {
  const userId = await requireUserId();
  if (folderId !== null) assertId(folderId);
  return NoteService.createNote(userId, folderId);
}

export async function updateNoteAction(
  id: string,
  data: NoteUpdate,
): Promise<NoteMeta | null> {
  const userId = await requireUserId();
  assertId(id);

  const clean: NoteUpdate = {};
  if (data.title !== undefined) {
    if (typeof data.title !== 'string') throw new Error('INVALID_TITLE');
    clean.title = data.title.slice(0, TITLE_MAX);
  }
  if (data.content !== undefined) {
    if (typeof data.content !== 'object' || data.content === null) {
      throw new Error('INVALID_CONTENT');
    }
    clean.content = data.content;
  }
  if (data.folderId !== undefined) {
    if (data.folderId !== null) assertId(data.folderId);
    clean.folderId = data.folderId;
  }

  return NoteService.updateNote(userId, id, clean);
}

export async function deleteNoteAction(id: string): Promise<void> {
  const userId = await requireUserId();
  assertId(id);
  await NoteService.deleteNote(userId, id);
}

export async function createFolderAction(name: string): Promise<FolderMeta> {
  const userId = await requireUserId();
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('INVALID_NAME');
  }
  return NoteService.createFolder(userId, name.trim().slice(0, FOLDER_NAME_MAX));
}

export async function renameFolderAction(
  id: string,
  name: string,
): Promise<void> {
  const userId = await requireUserId();
  assertId(id);
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('INVALID_NAME');
  }
  await NoteService.renameFolder(userId, id, name.trim().slice(0, FOLDER_NAME_MAX));
}

export async function deleteFolderAction(id: string): Promise<void> {
  const userId = await requireUserId();
  assertId(id);
  await NoteService.deleteFolder(userId, id);
}
