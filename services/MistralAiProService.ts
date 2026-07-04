import { Mistral } from '@mistralai/mistralai';
import {
  CORRECTEUR_SYSTEM_PROMPT,
  CORRECTEUR_JSON_SCHEMA,
} from './prompts/correcteur.prompt';
import {
  buildAssistantRedacteurPrompt,
  ASSISTANT_REDACTEUR_JSON_SCHEMA,
  type AssistantOptions,
} from './prompts/assistantRedacteur.prompt';
import {
  buildFinalCheckPrompt,
  FINAL_CHECK_JSON_SCHEMA,
  type AppliedCorrection,
} from './prompts/finalCheck.prompt';

/** Modèles Mistral utilisés par le service (prompts versionnés dans services/prompts/). */
const CORRECTEUR_MODEL = 'mistral-large-latest';
const ASSISTANT_REDACTEUR_MODEL = 'mistral-small-latest';
/**
 * La passe de vérification finale exige une cohérence inter-phrases que
 * mistral-small ne garantit pas ; elle ne tourne qu'une fois par pause
 * d'écriture, le surcoût de mistral-medium reste donc borné.
 */
const FINAL_CHECK_MODEL = 'mistral-medium-latest';

export interface CorrectionIssue {
  id: string;
  texte_original: string;
  correction: string;
  type: "orthographe" | "grammaire" | "typographie" | "style" | "ponctuation";
  explication: string;
  /** Index (base 0) de l'occurrence fautive de texte_original dans le texte vérifié. */
  occurrence?: number;
}

export interface CorrectionResponse {
  texte_corrige_complet?: string;
  raisonnement_global?: string;
  erreurs: CorrectionIssue[];
}

export class MistralAiProService {
  private static client = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY,
  });


  static async autoCheckSpellingAndFormat(text: string, options?: AssistantOptions): Promise<string> {
    try {
      const response = await this.client.chat.complete({
        model: ASSISTANT_REDACTEUR_MODEL,
        messages: [
          { role: 'system', content: buildAssistantRedacteurPrompt(options ?? {}) },
          { role: 'user', content: text },
        ],
        responseFormat: {
          type: 'json_schema',
          jsonSchema: {
            name: 'texte_corrige',
            schemaDefinition: ASSISTANT_REDACTEUR_JSON_SCHEMA,
            strict: true,
          },
        },
      });

      const result = response.choices?.[0]?.message?.content;
      if (typeof result !== 'string') {
        throw new Error('Invalid response from Mistral AI');
      }

      const parsed: { texte_corrige?: unknown } = JSON.parse(result);
      if (typeof parsed.texte_corrige !== 'string') {
        throw new Error('Missing "texte_corrige" field in Mistral AI response');
      }
      return parsed.texte_corrige.trim();
    } catch (error) {
      console.error('Mistral AI Pro Service Error:', error);
      throw new Error('Failed to correct spelling with Mistral API.');
    }
  }


  /**
   * Passe de vérification finale : relit le texte COMPLET (déjà corrigé phrase
   * par phrase) et réconcilie les corrections inline avec le contexte global.
   * Fallback robuste : en cas d'erreur (API, JSON invalide), retourne le texte
   * d'entrée inchangé pour ne jamais dégrader le contenu de l'utilisateur.
   */
  static async finalCheck(
    text: string,
    appliedCorrections: AppliedCorrection[],
    options?: AssistantOptions
  ): Promise<string> {
    try {
      const response = await this.client.chat.complete({
        model: FINAL_CHECK_MODEL,
        messages: [
          { role: 'system', content: buildFinalCheckPrompt(options ?? {}, appliedCorrections) },
          { role: 'user', content: text },
        ],
        responseFormat: {
          type: 'json_schema',
          jsonSchema: {
            name: 'texte_corrige',
            schemaDefinition: FINAL_CHECK_JSON_SCHEMA,
            strict: true,
          },
        },
      });

      const result = response.choices?.[0]?.message?.content;
      if (typeof result !== 'string') {
        throw new Error('Invalid response from Mistral AI');
      }

      const parsed: { texte_corrige?: unknown } = JSON.parse(result);
      if (typeof parsed.texte_corrige !== 'string') {
        throw new Error('Missing "texte_corrige" field in Mistral AI response');
      }
      return parsed.texte_corrige.trim();
    } catch (error) {
      console.error('Mistral AI Final Check Error:', error);
      return text;
    }
  }


  static async checkSpelling(text: string): Promise<CorrectionResponse> {
    try {
      const response = await this.client.chat.complete({
        model: CORRECTEUR_MODEL,
        messages: [
          { role: 'system', content: CORRECTEUR_SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        responseFormat: {
          type: 'json_schema',
          jsonSchema: {
            name: 'diagnostic_correction',
            schemaDefinition: CORRECTEUR_JSON_SCHEMA,
            strict: true,
          },
        },
      });

      const result = response.choices?.[0]?.message?.content;
      if (typeof result !== 'string') {
        throw new Error('Invalid response from Mistral AI');
      }

      // On transforme la chaîne de caractères en véritable objet TypeScript
      const parsedData: CorrectionResponse = JSON.parse(result);
      return parsedData;

    } catch (error) {
      console.error('Mistral AI JSON Parsing Error:', error);
      // Fallback robuste : si l'IA hallucine ou si l'API crash, on renvoie zéro erreur
      // Cela évite que l'application React ne s'effondre avec un "White Screen of Death"
      return { erreurs: [] };
    }
  }

}
