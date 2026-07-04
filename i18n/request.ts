import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { LOCALE_COOKIE, sanitizeLocale } from './locales';

/**
 * Configuration de requête next-intl (setup "without i18n routing") :
 * la locale active est lue dans le cookie NEXT_LOCALE (défaut : 'fr').
 * Ce module est résolu par le plugin next-intl via l'alias `next-intl/config`.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = sanitizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
