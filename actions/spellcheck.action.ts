'use server';

import { AiProService, type AssistantCorrectionResult } from '@/services/AiProService';
import { allowAiRequest } from '@/lib/aiGate';
import {
  sanitizeAssistantOptions,
  type AssistantOptions,
} from '@/services/prompts/assistantRedacteur.prompt';
import { CorrectionResponse } from '@/services/aiTypes';
import {
  sanitizeUiLocale,
  sanitizeCorrecteurOptions,
  type CorrecteurOptions,
} from '@/services/prompts/correcteur.prompt';

/** Signal de quota anonyme épuisé, renvoyé de façon typée (les messages des
 * erreurs jetées sont masqués par Next en production). */
export interface RateLimited {
  rateLimited: true;
}

/**
 * Server Action acting as a Controller for spellcheck functionality.
 * MVC: Controller Layer
 */
export async function spellcheckAction(
  text: string,
  useBooster: boolean = false,
  options?: AssistantOptions
): Promise<AssistantCorrectionResult | RateLimited> {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text provided for spellcheck.');
  }
  if (!(await allowAiRequest())) {
    return { rateLimited: true };
  }

  return await AiProService.autoCheckSpellingAndFormat(text, sanitizeAssistantOptions(options));
}

export async function checkSpellingIssuesAction(
  text: string,
  uiLocale?: string,
  options?: CorrecteurOptions
): Promise<CorrectionResponse | RateLimited> {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text provided for spellcheck.');
  }
  if (!(await allowAiRequest())) {
    return { rateLimited: true };
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
