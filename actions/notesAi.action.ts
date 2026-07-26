'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { AiProService } from '@/services/AiProService';
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

async function requireSession(): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error('UNAUTHORIZED');
}

function assertText(value: unknown, max: number): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new Error('INVALID_TEXT');
  }
}

export async function askNoteAction(
  noteText: string,
  question: string,
  uiLocale?: string,
): Promise<{ answer: string }> {
  await requireSession();
  assertText(noteText, NOTE_TEXT_MAX);
  assertText(question, QUESTION_MAX);
  const answer = await AiProService.askNote(
    noteText,
    question,
    sanitizeUiLocale(uiLocale),
  );
  return { answer };
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
