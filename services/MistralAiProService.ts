import { Mistral } from '@mistralai/mistralai';

export interface CorrectionIssue {
  texte_original: string;
  correction: string;
  type: "orthographe" | "grammaire" | "typographie" | "style" | "ponctuation";
  explication: string;
}

export interface CorrectionResponse {
  erreurs: CorrectionIssue[];
}

/**
 * DOCUMENTATION Configuration retour de L'agent correcteur:
 * Ce schéma n'est pas passé directement dans l'appel API car il est configuré
 * en dur sur l'Agent IA (ID: ag_019cc9f46ba17798825ec75aac41c7a8).
 * Il est présent ici à titre de référence pour maintenir la cohérence avec les interfaces ci-dessus.
 */
export const MISTRAL_AGENT_SCHEMA_REFERENCE = {
  "type": "object",
  "required": [
    "erreurs"
  ],
  "properties": {
    "erreurs": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "texte_original",
          "correction",
          "type",
          "explication"
        ],
        "properties": {
          "type": {
            "enum": [
              "orthographe",
              "grammaire",
              "typographie",
              "style",
              "ponctuation"
            ],
            "type": "string",
            "description": "La catégorie de l'erreur."
          },
          "correction": {
            "type": "string",
            "description": "La version corrigée."
          },
          "explication": {
            "type": "string",
            "description": "Une explication courte et pédagogique justifiant la correction."
          },
          "texte_original": {
            "type": "string",
            "description": "Le mot ou le bout de phrase exact comportant l'erreur, tel qu'il est écrit dans le texte d'origine."
          }
        },
        "additionalProperties": false
      },
      "description": "Liste des erreurs trouvées dans le texte."
    }
  },
  "additionalProperties": false
};

export class MistralAiProService {
  private static client = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY,
  });


  static async autoCheckSpellingAndFormat(text: string): Promise<string> {
    try {
      const response = await this.client.agents.complete({
        agentId: 'ag_019cc33e0cd5741080d0523a1dfab603', //agent assistant redacteur
        messages: [{ role: 'user', content: text }],
      });

      const result = response.choices?.[0]?.message?.content;
      if (typeof result !== 'string') {
        throw new Error('Invalid response from Mistral AI');
      }
      return result.trim();
    } catch (error) {
      console.error('Mistral AI Pro Service Error:', error);
      throw new Error('Failed to correct spelling with Mistral API.');
    }
  }


  static async checkSpelling(text: string): Promise<CorrectionResponse> {
    try {
      const response = await this.client.agents.complete({
        agentId: 'ag_019cc9f46ba17798825ec75aac41c7a8', // agent correcteur
        messages: [{ role: 'user', content: text }],
        responseFormat: { type: 'json_object' } // Sécurité : force Mistral à valider le JSON
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