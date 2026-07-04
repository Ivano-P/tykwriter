'use server';

import { OllamaService } from '@/services/OllamaService';
import { MistralAiProService } from '@/services/MistralAiProService';
import {
  sanitizeAssistantOptions,
  type AssistantOptions,
} from '@/services/prompts/assistantRedacteur.prompt';

/**
 * Server Action acting as a Controller for spellcheck functionality.
 * MVC: Controller Layer
 */
export async function spellcheckAction(
  text: string,
  useBooster: boolean = false,
  options?: AssistantOptions
): Promise<string> {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text provided for spellcheck.');
  }


  return await MistralAiProService.autoCheckSpellingAndFormat(text, sanitizeAssistantOptions(options));
  //return await OllamaService.checkSpelling(text); //use this to test the local ollama server
}

import { CorrectionResponse } from '@/services/MistralAiProService';
import { sanitizeUiLocale } from '@/services/prompts/correcteur.prompt';

export async function checkSpellingIssuesAction(
  text: string,
  uiLocale?: string
): Promise<CorrectionResponse> {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text provided for spellcheck.');
  }
  // Locale d'interface (langue des explications) : seules 'fr'|'en' sont
  // acceptées, toute autre valeur retombe sur 'fr'.
  return await MistralAiProService.checkSpelling(text, sanitizeUiLocale(uiLocale));
}

