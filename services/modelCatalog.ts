/**
 * Catalogue des fournisseurs IA et de leurs modèles sélectionnables depuis la
 * page d'administration. Module PUR (aucun accès fs/env) : importable côté
 * client comme côté serveur.
 *
 * Tarifs indicatifs (juillet 2026, $ / 1M tokens entrée → sortie) dans les
 * libellés pour éclairer le choix dans l'admin.
 */

export type AiProvider = 'mistral' | 'gemini';

/** Rôles fonctionnels de l'application, chacun avec son propre modèle. */
export type AiRole = 'correcteur' | 'assistant' | 'finalCheck' | 'traduction';

export const AI_ROLES: readonly AiRole[] = ['correcteur', 'assistant', 'finalCheck', 'traduction'];

export interface RoleModelChoice {
  provider: AiProvider;
  model: string;
}

export type ModelSettings = Record<AiRole, RoleModelChoice>;

export interface CatalogModel {
  id: string;
  /** Libellé affiché dans l'admin (nom + tarif indicatif). */
  label: string;
}

export const MODEL_CATALOG: Record<AiProvider, CatalogModel[]> = {
  mistral: [
    { id: 'mistral-large-latest', label: 'Mistral Large 3 — $0.50 → $1.50' },
    { id: 'mistral-medium-latest', label: 'Mistral Medium 3.5 — $1.50 → $7.50' },
    { id: 'mistral-small-latest', label: 'Mistral Small 4 — $0.15 → $0.60' },
    { id: 'ministral-14b-latest', label: 'Ministral 3 14B — $0.20 → $0.20' },
  ],
  gemini: [
    { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash — $1.50 → $7.50' },
    { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash — $1.50 → $9.00' },
    { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite — $0.30 → $2.50' },
    { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite — $0.25 → $1.50' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro — $1.25 → $10.00' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash — $0.30 → $2.50' },
    { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite — $0.10 → $0.40' },
  ],
};

/** Libellés des rôles pour l'admin (indépendants de la locale de l'UI publique). */
export const ROLE_LABELS: Record<AiRole, string> = {
  correcteur: 'Correcteur (diagnostic des erreurs)',
  assistant: 'Assistant rédacteur (correction par phrase)',
  finalCheck: 'Vérification finale (relecture globale)',
  traduction: 'Traduction',
};

/**
 * Réglages par défaut = modèles historiques de l'application (Mistral).
 * La passe finale exige une cohérence inter-phrases (medium) ; la traduction
 * couvre des cibles CJK/cyrilliques (large) ; les chunks fréquents restent
 * sur small pour la latence et le coût.
 */
export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  correcteur: { provider: 'mistral', model: 'mistral-large-latest' },
  assistant: { provider: 'mistral', model: 'mistral-small-latest' },
  finalCheck: { provider: 'mistral', model: 'mistral-medium-latest' },
  traduction: { provider: 'mistral', model: 'mistral-large-latest' },
};

export function isValidChoice(value: unknown): value is RoleModelChoice {
  if (!value || typeof value !== 'object') return false;
  const { provider, model } = value as Record<string, unknown>;
  if (provider !== 'mistral' && provider !== 'gemini') return false;
  if (typeof model !== 'string') return false;
  return MODEL_CATALOG[provider].some((m) => m.id === model);
}

/** Valide un objet complet d'origine externe ; toute entrée invalide retombe sur le défaut. */
export function sanitizeModelSettings(input: unknown): ModelSettings {
  const settings: ModelSettings = { ...DEFAULT_MODEL_SETTINGS };
  if (input && typeof input === 'object') {
    for (const role of AI_ROLES) {
      const choice = (input as Record<string, unknown>)[role];
      if (isValidChoice(choice)) {
        settings[role] = { provider: choice.provider, model: choice.model };
      }
    }
  }
  return settings;
}
