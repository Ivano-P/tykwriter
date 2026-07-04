'use server';

import { MistralAiProService } from '@/services/MistralAiProService';
import {
  sanitizeTargetLanguage,
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
  targetLanguage?: string
): Promise<TraductionResponse> {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text provided for translation.');
  }
  if (text.length > MAX_CHARS) {
    throw new Error(`Text exceeds ${MAX_CHARS} characters.`);
  }
  return await MistralAiProService.translate(text, sanitizeTargetLanguage(targetLanguage));
}
