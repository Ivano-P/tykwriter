import { NextResponse } from 'next/server';
import { MistralAiProService } from '@/services/MistralAiProService';

/**
 * Route de test dev : POST { "text": "..." } pour vérifier le correcteur Mistral.
 */
export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Invalid text provided.' }, { status: 400 });
    }
    const result = await MistralAiProService.checkSpelling(text);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
