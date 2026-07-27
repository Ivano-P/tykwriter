'use server';

import { AiProService } from '@/services/AiProService';
import { allowAiRequest } from '@/lib/aiGate';
import type { RateLimited } from '@/actions/spellcheck.action';
import {
  sanitizeTargetLanguage,
  sanitizeSourceLanguage,
  type TraductionResponse,
} from '@/services/prompts/traduction.prompt';

/** Même plafond que les autres modes (MAX_CHARS des pages workspace). */
const MAX_CHARS = 2000;

/**
 * Server Action acting as a Controller for the translation mode.
 * MVC: Controller Layer — validation only, business logic in the Service.
 */
export async function translateAction(
  text: string,
  targetLanguage?: string,
  sourceLanguage?: string
): Promise<TraductionResponse | RateLimited> {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text provided for translation.');
  }
  if (text.length > MAX_CHARS) {
    throw new Error(`Text exceeds ${MAX_CHARS} characters.`);
  }
  if (!(await allowAiRequest())) {
    return { rateLimited: true };
  }
  return await AiProService.translate(
    text,
    sanitizeTargetLanguage(targetLanguage),
    sanitizeSourceLanguage(sourceLanguage)
  );
}
