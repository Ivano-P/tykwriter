'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, sanitizeLocale } from '@/i18n/locales';

/** Durée de vie du cookie de locale : 1 an. */
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Server Action acting as a Controller for the UI locale.
 * MVC: Controller Layer — écrit le cookie NEXT_LOCALE lu par i18n/request.ts.
 * Toute valeur inconnue retombe sur la locale par défaut ('fr').
 */
export async function setLocaleAction(locale: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, sanitizeLocale(locale), {
    path: '/',
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: 'lax',
  });
}
