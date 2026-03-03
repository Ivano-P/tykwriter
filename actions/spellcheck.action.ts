'use server';

import { SpellcheckService } from '@/services/spellcheck.service';

/**
 * Server Action acting as a Controller for spellcheck functionality.
 * MVC: Controller Layer
 */
export async function spellcheckAction(text: string): Promise<string> {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text provided for spellcheck.');
  }

  const spellcheckService = new SpellcheckService();
  return await spellcheckService.checkText(text);
}
