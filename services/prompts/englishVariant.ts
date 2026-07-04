/**
 * Variante d'anglais exigée par l'utilisateur, partagée par le correcteur et
 * l'assistant rédacteur.
 * - 'auto' : les orthographes britannique et américaine sont toutes deux
 *   acceptées (comportement historique) ;
 * - 'us'   : conventions américaines imposées (colour → color, etc.) ;
 * - 'uk'   : conventions britanniques imposées (color → colour, etc.).
 * La variante n'a d'effet QUE sur un texte en anglais.
 */

export type EnglishVariant = 'auto' | 'us' | 'uk';

export const ENGLISH_VARIANTS: readonly EnglishVariant[] = ['auto', 'us', 'uk'];

/** Ramène toute valeur externe à une variante supportée (défaut : 'auto'). */
export function sanitizeEnglishVariant(value: unknown): EnglishVariant {
  return typeof value === 'string' && (ENGLISH_VARIANTS as readonly string[]).includes(value)
    ? (value as EnglishVariant)
    : 'auto';
}

/**
 * Langue d'écriture déclarée dans le sélecteur de la barre d'outils
 * (correcteur et assistant rédacteur). Codes BCP 47 pour Intl.DisplayNames.
 * 'fr' correspond à la variante 'auto' : la détection automatique de la langue
 * du texte reste active dans tous les cas, seule la convention orthographique
 * anglaise change.
 */
export type WritingLanguage = 'fr' | 'en-US' | 'en-GB';

export const WRITING_LANGUAGES: readonly WritingLanguage[] = ['fr', 'en-US', 'en-GB'];

const WRITING_TO_VARIANT: Record<WritingLanguage, EnglishVariant> = {
  fr: 'auto',
  'en-US': 'us',
  'en-GB': 'uk',
};

const VARIANT_TO_WRITING: Record<EnglishVariant, WritingLanguage> = {
  auto: 'fr',
  us: 'en-US',
  uk: 'en-GB',
};

export function writingLanguageToVariant(lang: WritingLanguage): EnglishVariant {
  return WRITING_TO_VARIANT[lang];
}

export function variantToWritingLanguage(variant: EnglishVariant): WritingLanguage {
  return VARIANT_TO_WRITING[variant];
}

export function sanitizeWritingLanguage(value: unknown): WritingLanguage {
  return typeof value === 'string' && (WRITING_LANGUAGES as readonly string[]).includes(value)
    ? (value as WritingLanguage)
    : 'fr';
}
