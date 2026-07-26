'use server';

import { randomUUID } from 'node:crypto';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { NoteService } from '@/services/NoteService';
import { StorageService } from '@/services/StorageService';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 Mo
const ALLOWED_TYPES = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/gif', 'gif'],
  ['image/webp', 'webp'],
  ['image/svg+xml', 'svg'],
]);

export interface UploadTicket {
  uploadUrl: string;
  publicUrl: string;
}

/**
 * Prépare un upload d'image direct navigateur → R2 (URL présignée PUT).
 * Clé : notes/{userId}/{noteId}/{uuid}.{ext} (purge par note/compte possible).
 */
export async function createImageUploadAction(
  noteId: string,
  contentType: string,
  size: number,
): Promise<UploadTicket> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error('UNAUTHORIZED');

  const ext = ALLOWED_TYPES.get(contentType);
  if (!ext) throw new Error('INVALID_TYPE');
  if (typeof size !== 'number' || size <= 0 || size > MAX_IMAGE_BYTES) {
    throw new Error('FILE_TOO_LARGE');
  }

  // La note doit exister et appartenir à l'utilisateur.
  const note = await NoteService.getNote(session.user.id, noteId);
  if (!note) throw new Error('NOT_FOUND');

  const key = `notes/${session.user.id}/${noteId}/${randomUUID()}.${ext}`;
  const uploadUrl = await StorageService.createUploadUrl(key, contentType);

  return { uploadUrl, publicUrl: StorageService.publicUrl(key) };
}
