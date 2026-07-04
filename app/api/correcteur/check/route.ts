import { NextResponse } from 'next/server';
import { MistralAiProService } from '@/services/MistralAiProService';
import { SpellcheckService } from '@/services/SpellcheckService';
import {
  sanitizeUiLocale,
  sanitizeCorrecteurOptions,
} from '@/services/prompts/correcteur.prompt';
import { checkApiKey, consumeRateLimit } from '@/lib/apiGuard';
import { corsHeaders } from '@/lib/cors';

/**
 * Endpoint HTTP du correcteur pour les consommateurs externes (extension
 * Chrome). Reçoit UN paragraphe, renvoie les erreurs déjà traitées par
 * SpellcheckService.processResponse (UUIDs, corrections minimales,
 * occurrences localisées) : le client n'a aucune logique de diff à porter.
 *
 * POST { text: string, uiLocale?: 'fr'|'en', options?: { englishVariant } }
 *   → { issues: CorrectionIssue[] }
 */

// Même plafond que le correcteur web (MAX_CHARS de la page correcteur).
const MAX_CHARS = 2000;

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  const headers = corsHeaders(request);

  const keyError = checkApiKey(request);
  if (keyError) {
    return NextResponse.json({ error: keyError }, { status: 401, headers });
  }
  if (!consumeRateLimit(request)) {
    return NextResponse.json(
      { error: 'Too many requests.' },
      { status: 429, headers },
    );
  }

  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid text provided.' },
        { status: 400, headers },
      );
    }
    if (text.length > MAX_CHARS) {
      return NextResponse.json(
        { error: `Text exceeds ${MAX_CHARS} characters.` },
        { status: 400, headers },
      );
    }

    const response = await MistralAiProService.checkSpelling(
      text,
      sanitizeUiLocale(body.uiLocale),
      sanitizeCorrecteurOptions(body.options),
    );
    const issues = SpellcheckService.processResponse(response, text);

    return NextResponse.json({ issues }, { headers });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request was aborted.' },
        { status: 499, headers },
      );
    }
    console.error('Error in /api/correcteur/check:', error);
    const message =
      error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500, headers });
  }
}
