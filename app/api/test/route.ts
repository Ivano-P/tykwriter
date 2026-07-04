import { NextResponse } from 'next/server';
import { MistralAiProService } from '@/services/MistralAiProService';
import { sanitizeTargetLanguage } from '@/services/prompts/traduction.prompt';

/**
 * Route de test dev :
 * POST { "text": "..." }                            → correcteur
 * POST { "text": "...", "mode": "traduction", "targetLanguage": "en-US" } → traducteur
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Invalid text provided.' }, { status: 400 });
    }
    if (body.mode === 'traduction') {
      const result = await MistralAiProService.translate(text, sanitizeTargetLanguage(body.targetLanguage));
      return NextResponse.json({ result });
    }
    const result = await MistralAiProService.checkSpelling(text);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
