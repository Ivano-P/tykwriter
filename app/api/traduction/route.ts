import { AiProService } from '@/services/AiProService';
import {
  sanitizeTargetLanguage,
  sanitizeSourceLanguage,
  SHORT_TEXT_FOR_ALTERNATIVES,
} from '@/services/prompts/traduction.prompt';

/**
 * Traduction en streaming pour le mode /traduction (même origine uniquement).
 * POST { text, targetLanguage?, sourceLanguage? }
 * Réponse : text/plain streamé —
 *   ligne 1 : en-tête JSON {"langue_detectee":"xx","est_supportee":bool}
 *   suite   : texte traduit brut, émis au fil de la génération.
 * L'annulation côté client (AbortController) est propagée à l'appel Mistral,
 * ce qui stoppe la génération (et sa facturation) immédiatement.
 */

const MAX_CHARS = 2000;

export async function POST(request: Request) {
  let body: { text?: unknown; targetLanguage?: unknown; sourceLanguage?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), { status: 400 });
  }

  const { text } = body;
  if (!text || typeof text !== 'string') {
    return new Response(JSON.stringify({ error: 'Invalid text provided.' }), { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return new Response(JSON.stringify({ error: `Text exceeds ${MAX_CHARS} characters.` }), {
      status: 400,
    });
  }

  const target = sanitizeTargetLanguage(body.targetLanguage);
  const source = sanitizeSourceLanguage(body.sourceLanguage);
  // Alternatives proposées uniquement pour les textes courts (une seule
  // traduction au-delà du seuil).
  const withAlternatives = text.length <= SHORT_TEXT_FOR_ALTERNATIVES;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Normalisation du protocole : malgré la directive, le modèle encadre
      // parfois l'en-tête de balises ``` — on les retire ici pour garantir au
      // client « ligne 1 = JSON, suite = texte brut ».
      let headerSent = false;
      let preHeaderBuffer = '';
      // Retenue de fin de flux : permet de supprimer une éventuelle balise ```
      // de clôture sans jamais tronquer du vrai texte déjà émis.
      let holdback = '';
      const HOLDBACK_SIZE = 8;

      const emit = (s: string) => {
        if (!s) return;
        holdback += s;
        if (holdback.length > HOLDBACK_SIZE) {
          controller.enqueue(encoder.encode(holdback.slice(0, -HOLDBACK_SIZE)));
          holdback = holdback.slice(-HOLDBACK_SIZE);
        }
      };
      const flushHoldback = () => {
        const cleaned = holdback.replace(/\s*```\s*$/, '');
        if (cleaned) controller.enqueue(encoder.encode(cleaned));
        holdback = '';
      };

      try {
        for await (const chunk of AiProService.translateStream(
          text,
          target,
          source,
          request.signal,
          withAlternatives
        )) {
          if (headerSent) {
            emit(chunk);
            continue;
          }
          preHeaderBuffer += chunk;
          // Cherche la première ligne qui est l'en-tête JSON, en ignorant les
          // lignes de fence (```/```json) et les lignes vides.
          let newlineIndex: number;
          while (!headerSent && (newlineIndex = preHeaderBuffer.indexOf('\n')) !== -1) {
            const line = preHeaderBuffer.slice(0, newlineIndex).trim();
            preHeaderBuffer = preHeaderBuffer.slice(newlineIndex + 1);
            if (line === '' || /^```/.test(line)) continue;
            // Ligne candidate : l'en-tête doit être la première ligne utile.
            controller.enqueue(encoder.encode(line + '\n'));
            headerSent = true;
          }
          if (headerSent && preHeaderBuffer) {
            // Le reliquat appartient au corps ; purge une fence résiduelle en tête.
            emit(preHeaderBuffer.replace(/^\s*```[a-z]*\s*\n?/, ''));
            preHeaderBuffer = '';
          }
        }
        // Fin de flux : en-tête jamais suivi d'un \n (réponse mono-ligne, cas
        // « langue non supportée ») — l'émettre tel quel.
        if (!headerSent) {
          const line = preHeaderBuffer.replace(/```[a-z]*/g, '').trim();
          if (line) controller.enqueue(encoder.encode(line + '\n'));
        }
        flushHoldback();
        controller.close();
      } catch (error) {
        if (request.signal.aborted) {
          controller.close();
          return;
        }
        console.error('Error in /api/traduction stream:', error);
        controller.error(error);
      }
    },
    cancel() {
      // Le lecteur a annulé : request.signal est déjà propagé à Mistral.
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
