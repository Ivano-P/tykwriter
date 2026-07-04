/**
 * Locales supportées par l'interface Tykwriter.
 * Le français reste la langue source de vérité ; l'anglais est la seconde
 * locale d'interface. La locale active est stockée dans le cookie NEXT_LOCALE
 * (pas de préfixe d'URL — setup next-intl "without i18n routing").
 */

export const SUPPORTED_LOCALES = ['fr', 'en'] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'fr';

/** Nom du cookie lu par i18n/request.ts et écrit par actions/locale.action.ts. */
export const LOCALE_COOKIE = 'NEXT_LOCALE';

/** Ramène toute valeur externe (cookie, payload) à une locale supportée. */
export function sanitizeLocale(value: unknown): AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale)
    ? (value as AppLocale)
    : DEFAULT_LOCALE;
}
