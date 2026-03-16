'use server';

import { MistralAiProService } from '@/services/MistralAiProService';

/**
 * Server Action acting as a Controller for spellcheck functionality.
 * MVC: Controller Layer
 */
export async function spellcheckAction(text: string): Promise<string> {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text provided for spellcheck.');
  }

  // Ensure dynamic APIs are awaited if any are added here in the future
  return await MistralAiProService.checkSpelling(text);
}
