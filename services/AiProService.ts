import { MistralProvider } from './providers/MistralProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { ModelSettingsStore } from './ModelSettingsStore';
import type { AiRole } from './modelCatalog';
import {
  buildCorrecteurPrompt,
  CORRECTEUR_JSON_SCHEMA,
  type UiLocale,
  type CorrecteurOptions,
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
import {
  buildTraductionPrompt,
  buildTraductionStreamPrompt,
  TRADUCTION_JSON_SCHEMA,
  type TargetLanguage,
  type SourceLanguage,
  type TraductionResponse,
} from './prompts/traduction.prompt';
import {
  buildAskNotePrompt,
  buildRestructureNotePrompt,
  ASK_NOTE_JSON_SCHEMA,
  RESTRUCTURE_NOTE_JSON_SCHEMA,
} from './prompts/notesAi.prompt';
import type {
  CorrectionResponse,
  AssistantCorrectionResult,
} from './aiTypes';

export type { CorrectionIssue, CorrectionResponse, AssistantCorrectionResult } from './aiTypes';

/**
 * Service métier des fonctionnalités IA (ex-MistralAiProService).
 * Le fournisseur et le modèle de chaque rôle (correcteur, assistant,
 * vérification finale, traduction) sont résolus à l'exécution via
 * ModelSettingsStore — modifiables depuis la page /admin sans redéploiement.
 * Les prompts restent versionnés dans services/prompts/.
 */
export class AiProService {
  /** Complétion JSON via le fournisseur configuré pour le rôle. */
  private static async completeJson(
    role: AiRole,
    system: string,
    user: string,
    schema: object,
    schemaName: string
  ): Promise<string> {
    const { provider, model } = await ModelSettingsStore.getRoleModel(role);
    if (provider === 'gemini') {
      return GeminiProvider.completeJson({ model, system, user, schema });
    }
    return MistralProvider.completeJson({ model, system, user, schema, schemaName });
  }

  static async autoCheckSpellingAndFormat(
    text: string,
    options?: AssistantOptions
  ): Promise<AssistantCorrectionResult> {
    try {
      // Variante condensée : mêmes règles, exemples réduits — les appels par
      // chunk sont fréquents, le poids du prompt domine leur coût/latence.
      const result = await this.completeJson(
        'assistant',
        buildAssistantRedacteurPrompt(options ?? {}, { condensed: true }),
        text,
        ASSISTANT_REDACTEUR_JSON_SCHEMA,
        'texte_corrige'
      );

      const parsed: { texte_corrige?: unknown; langue_detectee?: unknown } = JSON.parse(result);
      if (typeof parsed.texte_corrige !== 'string') {
        throw new Error('Missing "texte_corrige" field in AI response');
      }
      return {
        texteCorrige: parsed.texte_corrige.trim(),
        langueDetectee:
          typeof parsed.langue_detectee === 'string' ? parsed.langue_detectee : undefined,
      };
    } catch (error) {
      console.error('AiProService Error:', error);
      throw new Error('Failed to correct spelling with AI API.');
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
      const result = await this.completeJson(
        'finalCheck',
        buildFinalCheckPrompt(options ?? {}, appliedCorrections),
        text,
        FINAL_CHECK_JSON_SCHEMA,
        'texte_corrige'
      );

      const parsed: { texte_corrige?: unknown } = JSON.parse(result);
      if (typeof parsed.texte_corrige !== 'string') {
        throw new Error('Missing "texte_corrige" field in AI response');
      }
      return parsed.texte_corrige.trim();
    } catch (error) {
      console.error('AI Final Check Error:', error);
      return text;
    }
  }

  /**
   * Traduction avec détection automatique de la langue source.
   * Langue source non supportée → { est_supportee: false, traduction: '' }
   * (l'UI affiche l'erreur « langue non prise en charge »).
   * Les erreurs API remontent à l'appelant : contrairement au correcteur, il
   * n'existe pas de repli silencieux acceptable pour une traduction.
   */
  static async translate(
    text: string,
    targetLanguage: TargetLanguage,
    sourceLanguage: SourceLanguage = 'auto'
  ): Promise<TraductionResponse> {
    try {
      const result = await this.completeJson(
        'traduction',
        buildTraductionPrompt(targetLanguage, sourceLanguage),
        text,
        TRADUCTION_JSON_SCHEMA,
        'traduction'
      );

      const parsed: Partial<TraductionResponse> = JSON.parse(result);
      if (
        typeof parsed.langue_detectee !== 'string' ||
        typeof parsed.est_supportee !== 'boolean' ||
        typeof parsed.traduction !== 'string'
      ) {
        throw new Error('Malformed translation response from AI API');
      }
      return {
        langue_detectee: parsed.langue_detectee,
        est_supportee: parsed.est_supportee,
        traduction: parsed.traduction,
      };
    } catch (error) {
      console.error('AI Translation Error:', error);
      throw new Error('Failed to translate with AI API.');
    }
  }

  /**
   * Traduction en STREAMING : générateur asynchrone des fragments de texte
   * produits par le modèle. Protocole (voir buildTraductionStreamPrompt) :
   * première ligne = en-tête JSON {langue_detectee, est_supportee}, suite =
   * texte traduit brut. Le découpage/parsing est laissé au consommateur.
   * @param signal Annulation transmise au fournisseur : interrompre la
   *               requête stoppe la génération (et sa facturation) côté API.
   */
  static async *translateStream(
    text: string,
    targetLanguage: TargetLanguage,
    sourceLanguage: SourceLanguage = 'auto',
    signal?: AbortSignal,
    withAlternatives: boolean = false
  ): AsyncGenerator<string> {
    const { provider, model } = await ModelSettingsStore.getRoleModel('traduction');
    const params = {
      model,
      system: buildTraductionStreamPrompt(targetLanguage, sourceLanguage, withAlternatives),
      user: text,
      signal,
    };
    const stream =
      provider === 'gemini' ? GeminiProvider.stream(params) : MistralProvider.stream(params);
    yield* stream;
  }

  /**
   * Q&A sur une note : répond à une question en se basant sur le contenu.
   * Utilise le modèle du rôle 'assistant' (pas de rôle dédié pour l'instant).
   */
  static async askNote(
    noteText: string,
    question: string,
    uiLocale: UiLocale = 'fr'
  ): Promise<string> {
    try {
      const result = await this.completeJson(
        'assistant',
        buildAskNotePrompt(uiLocale),
        `NOTE :\n${noteText}\n\nQUESTION :\n${question}`,
        ASK_NOTE_JSON_SCHEMA,
        'reponse_note'
      );
      const parsed: { reponse?: unknown } = JSON.parse(result);
      if (typeof parsed.reponse !== 'string') {
        throw new Error('Missing "reponse" field in AI response');
      }
      return parsed.reponse.trim();
    } catch (error) {
      console.error('AI Ask Note Error:', error);
      throw new Error('Failed to answer about the note.');
    }
  }

  /**
   * Restructuration d'une note : reçoit le HTML de la note, retourne un HTML
   * mieux organisé (balises restreintes, fond conservé).
   * Utilise le modèle du rôle 'assistant' (pas de rôle dédié pour l'instant).
   */
  static async restructureNote(
    html: string,
    uiLocale: UiLocale = 'fr'
  ): Promise<string> {
    try {
      const result = await this.completeJson(
        'assistant',
        buildRestructureNotePrompt(uiLocale),
        html,
        RESTRUCTURE_NOTE_JSON_SCHEMA,
        'note_restructuree'
      );
      const parsed: { html?: unknown } = JSON.parse(result);
      if (typeof parsed.html !== 'string' || !parsed.html.trim()) {
        throw new Error('Missing "html" field in AI response');
      }
      return parsed.html.trim();
    } catch (error) {
      console.error('AI Restructure Note Error:', error);
      throw new Error('Failed to restructure the note.');
    }
  }

  /**
   * Diagnostic d'erreurs (correcteur bilingue FR/EN, langue du texte auto-détectée).
   * @param uiLocale Langue de l'interface : langue de rédaction des explications.
   * @param options  Options du correcteur (variante d'anglais exigée).
   */
  static async checkSpelling(
    text: string,
    uiLocale: UiLocale = 'fr',
    options?: CorrecteurOptions
  ): Promise<CorrectionResponse> {
    try {
      const result = await this.completeJson(
        'correcteur',
        buildCorrecteurPrompt(uiLocale, options ?? {}),
        text,
        CORRECTEUR_JSON_SCHEMA,
        'diagnostic_correction'
      );

      // On transforme la chaîne de caractères en véritable objet TypeScript
      const parsedData: CorrectionResponse = JSON.parse(result);
      return parsedData;
    } catch (error) {
      console.error('AI JSON Parsing Error:', error);
      // Fallback robuste : si l'IA hallucine ou si l'API crash, on renvoie zéro erreur
      // Cela évite que l'application React ne s'effondre avec un "White Screen of Death"
      return { erreurs: [] };
    }
  }
}
