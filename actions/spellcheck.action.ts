'use server';

import { OllamaService } from '@/services/OllamaService';
import { MistralAiProService } from '@/services/MistralAiProService';

/**
 * Server Action acting as a Controller for spellcheck functionality.
 * MVC: Controller Layer
 */
export async function spellcheckAction(text: string, useBooster: boolean = false): Promise<string> {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text provided for spellcheck.');
  }

  // Ensure dynamic APIs are awaited if any are added here in the future
  if (useBooster) {
    return await MistralAiProService.checkSpelling(text);
  } else {
    return await OllamaService.checkSpelling(text);
  }
}
