import { NextResponse } from 'next/server';
import { MistralAiProService } from '@/services/MistralAiProService';
import { sanitizeAssistantOptions } from '@/services/prompts/assistantRedacteur.prompt';
import { sanitizeAppliedCorrections } from '@/services/prompts/finalCheck.prompt';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Invalid text provided.' }, { status: 400 });
    }

    // Options d'écriture facultatives (ton, abréviations) ; valeurs invalides ignorées.
    const options = sanitizeAssistantOptions(body.options);

    // Mode facultatif 'final' : passe de vérification finale sur le texte complet,
    // avec la liste (validée et plafonnée) des corrections inline déjà appliquées.
    if (body.mode === 'final') {
      const appliedCorrections = sanitizeAppliedCorrections(body.appliedCorrections);
      const correctedText = await MistralAiProService.finalCheck(text, appliedCorrections, options);
      return NextResponse.json({ correctedText });
    }

    const result = await MistralAiProService.autoCheckSpellingAndFormat(text, options);
    return NextResponse.json({
      correctedText: result.texteCorrige,
      detectedLanguage: result.langueDetectee ?? null,
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request was aborted.' }, { status: 499 });
    }
    console.error('Error in /api/assistant:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
