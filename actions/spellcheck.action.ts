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

export async function checkSpellingIssuesAction(text: string): Promise<CorrectionResponse> {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text provided for spellcheck.');
  }
  return await MistralAiProService.checkSpelling(text);
}

