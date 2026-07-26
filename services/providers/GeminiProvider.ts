import { GoogleGenAI } from '@google/genai';

/**
 * Accès bas niveau à l'API Gemini : complétion JSON structurée et streaming
 * texte. Même contrat que MistralProvider pour que AiProService puisse
 * basculer de fournisseur sans toucher à la logique métier.
 */

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set.');
    }
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

/**
 * Gemini refuse certains mots-clés JSON Schema (additionalProperties, …) :
 * on les retire récursivement, la validation stricte reste garantie côté
 * parsing dans AiProService.
 */
function sanitizeSchemaForGemini(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(sanitizeSchemaForGemini);
  if (schema && typeof schema === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schema)) {
      if (key === 'additionalProperties') continue;
      out[key] = sanitizeSchemaForGemini(value);
    }
    return out;
  }
  return schema;
}

export class GeminiProvider {
  /** Complétion avec sortie JSON contrainte ; retourne la chaîne JSON brute. */
  static async completeJson(params: {
    model: string;
    system: string;
    user: string;
    schema: object;
  }): Promise<string> {
    const response = await getClient().models.generateContent({
      model: params.model,
      contents: params.user,
      config: {
        systemInstruction: params.system,
        responseMimeType: 'application/json',
        responseJsonSchema: sanitizeSchemaForGemini(params.schema),
        // Tâches de correction : sortie quasi déterministe.
        temperature: 0.2,
      },
    });

    const text = response.text;
    if (typeof text !== 'string' || !text) {
      throw new Error('Invalid response from Gemini API');
    }
    return text;
  }

  /** Streaming texte brut (traduction) ; fragments émis au fil de la génération. */
  static async *stream(params: {
    model: string;
    system: string;
    user: string;
    signal?: AbortSignal;
  }): AsyncGenerator<string> {
    const stream = await getClient().models.generateContentStream({
      model: params.model,
      contents: params.user,
      config: {
        systemInstruction: params.system,
        ...(params.signal ? { abortSignal: params.signal } : {}),
      },
    });

    for await (const chunk of stream) {
      const delta = chunk.text;
      if (typeof delta === 'string' && delta.length > 0) {
        yield delta;
      }
    }
  }
}
