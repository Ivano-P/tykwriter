'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { AiProService } from '@/services/AiProService';
import { NoteService } from '@/services/NoteService';
import {
  NoteChatService,
  type ChatExchange,
} from '@/services/NoteChatService';
import { sanitizeUiLocale } from '@/services/prompts/correcteur.prompt';
import {
  sanitizeTargetLanguage,
} from '@/services/prompts/traduction.prompt';

/**
 * Contrôleur des fonctionnalités IA des notes.
 * Réservé aux utilisateurs connectés (les notes le sont déjà) — pas de
 * rate limiting anonyme ici.
 */

const NOTE_TEXT_MAX = 20_000;
const NOTE_HTML_MAX = 60_000;
const QUESTION_MAX = 500;
const SELECTION_MAX = 5_000;

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error('UNAUTHORIZED');
  return session.user.id;
}

async function requireSession(): Promise<void> {
  await requireUserId();
}

/** Vérifie que la note existe et appartient à l'utilisateur. */
async function assertOwnsNote(userId: string, noteId: string): Promise<void> {
  const note = await NoteService.getNote(userId, noteId);
  if (!note) throw new Error('NOT_FOUND');
}

function assertText(value: unknown, max: number): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new Error('INVALID_TEXT');
  }
}

/** Nombre d'échanges récents fournis au modèle pour le suivi de conversation. */
const HISTORY_EXCHANGES = 6;

/** Historique du chat IA de la note (purge 90 jours au passage). */
export async function getNoteChatAction(
  noteId: string,
): Promise<{ exchanges: ChatExchange[] }> {
  const userId = await requireUserId();
  await assertOwnsNote(userId, noteId);
  await NoteChatService.purgeStale(userId);
  return { exchanges: await NoteChatService.list(userId, noteId) };
}

/**
 * Pose une question sur la note (chat) : le texte courant vient du client
 * (plus frais que la DB pendant le debounce d'autosave), l'historique vient
 * de la DB, et l'échange est enregistré.
 */
export async function askNoteAction(
  noteId: string,
  noteText: string,
  question: string,
  uiLocale?: string,
): Promise<{ exchange: ChatExchange }> {
  const userId = await requireUserId();
  await assertOwnsNote(userId, noteId);
  assertText(noteText, NOTE_TEXT_MAX);
  assertText(question, QUESTION_MAX);

  const history = (await NoteChatService.list(userId, noteId)).slice(
    -HISTORY_EXCHANGES,
  );
  const answer = await AiProService.askNote(
    noteText,
    question.trim(),
    history,
    sanitizeUiLocale(uiLocale),
  );
  const exchange = await NoteChatService.add(
    userId,
    noteId,
    question.trim(),
    answer,
  );
  return { exchange };
}

/** Supprime un échange question/réponse du chat. */
export async function deleteNoteChatExchangeAction(id: string): Promise<void> {
  const userId = await requireUserId();
  if (typeof id !== 'string' || !id) throw new Error('INVALID_ID');
  await NoteChatService.deleteExchange(userId, id);
}

export async function restructureNoteAction(
  noteHtml: string,
  uiLocale?: string,
): Promise<{ html: string }> {
  await requireSession();
  assertText(noteHtml, NOTE_HTML_MAX);
  const html = await AiProService.restructureNote(
    noteHtml,
    sanitizeUiLocale(uiLocale),
  );
  return { html };
}

export async function spellcheckSelectionAction(
  text: string,
): Promise<{ corrected: string }> {
  await requireSession();
  assertText(text, SELECTION_MAX);
  const result = await AiProService.autoCheckSpellingAndFormat(text);
  return { corrected: result.texteCorrige };
}

export async function translateSelectionAction(
  text: string,
  targetLanguage: string,
): Promise<{ translated: string; supported: boolean }> {
  await requireSession();
  assertText(text, SELECTION_MAX);
  const result = await AiProService.translate(
    text,
    sanitizeTargetLanguage(targetLanguage),
  );
  return { translated: result.traduction, supported: result.est_supportee };
}
