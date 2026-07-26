'use server';

import { AiProService, type AssistantCorrectionResult } from '@/services/AiProService';
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
): Promise<AssistantCorrectionResult> {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text provided for spellcheck.');
  }


  return await AiProService.autoCheckSpellingAndFormat(text, sanitizeAssistantOptions(options));
  // Pour tester avec le serveur Ollama local : importer OllamaService depuis
  // '@/services/OllamaService' et retourner OllamaService.checkSpelling(text).
}

import { CorrectionResponse } from '@/services/aiTypes';
import {
  sanitizeUiLocale,
  sanitizeCorrecteurOptions,
  type CorrecteurOptions,
} from '@/services/prompts/correcteur.prompt';

export async function checkSpellingIssuesAction(
  text: string,
  uiLocale?: string,
  options?: CorrecteurOptions
): Promise<CorrectionResponse> {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text provided for spellcheck.');
  }
  // Locale d'interface (langue des explications) : seules 'fr'|'en' sont
  // acceptées, toute autre valeur retombe sur 'fr'. Les options (variante
  // d'anglais) sont validées de la même façon.
  return await AiProService.checkSpelling(
    text,
    sanitizeUiLocale(uiLocale),
    sanitizeCorrecteurOptions(options)
  );
}

