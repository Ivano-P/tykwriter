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

export interface ReportUploadTicket extends UploadTicket {
  /** Clé R2, renvoyée pour être stockée avec le signalement (purge ensuite). */
  key: string;
}

/**
 * Prépare l'upload d'une capture d'écran jointe à un signalement.
 * Clé : reports/{userId}/{uuid}.{ext} — pas d'identifiant de signalement car
 * les captures sont envoyées AVANT la création de celui-ci.
 */
export async function createReportImageUploadAction(
  contentType: string,
  size: number,
): Promise<ReportUploadTicket> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error('UNAUTHORIZED');

  const ext = ALLOWED_TYPES.get(contentType);
  if (!ext) throw new Error('INVALID_TYPE');
  if (typeof size !== 'number' || size <= 0 || size > MAX_IMAGE_BYTES) {
    throw new Error('FILE_TOO_LARGE');
  }

  const key = `reports/${session.user.id}/${randomUUID()}.${ext}`;
  const uploadUrl = await StorageService.createUploadUrl(key, contentType);

  return { uploadUrl, publicUrl: StorageService.publicUrl(key), key };
}

/**
 * Supprime une capture retirée du formulaire avant envoi : sans cela le fichier
 * resterait indéfiniment sur R2 (aucun signalement ne le référence).
 * Le préfixe de la clé garantit que l'utilisateur ne peut effacer que ses
 * propres fichiers.
 */
export async function deleteReportImageAction(key: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error('UNAUTHORIZED');

  if (typeof key !== 'string' || !key.startsWith(`reports/${session.user.id}/`)) {
    throw new Error('INVALID_KEY');
  }
  await StorageService.deleteKeys([key]);
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
