import { Mistral } from '@mistralai/mistralai';

/**
 * Accès bas niveau à l'API Mistral : complétion JSON structurée et streaming
 * texte. Même contrat que GeminiProvider pour que AiProService puisse
 * basculer de fournisseur sans toucher à la logique métier.
 */

let client: Mistral | null = null;

function getClient(): Mistral {
  if (!client) {
    client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
  }
  return client;
}

export class MistralProvider {
  /** Complétion avec sortie JSON contrainte ; retourne la chaîne JSON brute. */
  static async completeJson(params: {
    model: string;
    system: string;
    user: string;
    schema: object;
    schemaName: string;
  }): Promise<string> {
    const response = await getClient().chat.complete({
      model: params.model,
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.user },
      ],
      responseFormat: {
        type: 'json_schema',
        jsonSchema: {
          name: params.schemaName,
          schemaDefinition: params.schema as { [k: string]: unknown },
          strict: true,
        },
      },
    });

    const result = response.choices?.[0]?.message?.content;
    if (typeof result !== 'string') {
      throw new Error('Invalid response from Mistral AI');
    }
    return result;
  }

  /** Streaming texte brut (traduction) ; fragments émis au fil de la génération. */
  static async *stream(params: {
    model: string;
    system: string;
    user: string;
    signal?: AbortSignal;
  }): AsyncGenerator<string> {
    const stream = await getClient().chat.stream(
      {
        model: params.model,
        messages: [
          { role: 'system', content: params.system },
          { role: 'user', content: params.user },
        ],
      },
      params.signal ? { fetchOptions: { signal: params.signal } } : undefined
    );

    for await (const event of stream) {
      const delta = event.data?.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta.length > 0) {
        yield delta;
      }
    }
  }
}
