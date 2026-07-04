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
