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


    return await MistralAiProService.checkSpelling(text);
    //return await OllamaService.checkSpelling(text); //use this to test the local ollama server
}
