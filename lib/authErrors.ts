/**
 * Traduction des codes d'erreur Better Auth en clés i18n (namespace `auth`).
 * Codes relevés dans better-auth 1.6.x (routes sign-in / sign-up / password) —
 * attention aux noms longs : le code « compte déjà existant » est
 * USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL, pas USER_ALREADY_EXISTS.
 */
const ERROR_KEYS: Record<string, string> = {
  // Inscription
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'errorEmailExists',
  USER_ALREADY_EXISTS: 'errorEmailExists',
  // Connexion
  INVALID_EMAIL_OR_PASSWORD: 'errorInvalidCredentials',
  INVALID_PASSWORD: 'errorInvalidCredentials',
  USER_EMAIL_NOT_FOUND: 'errorInvalidCredentials',
  // Validation
  INVALID_EMAIL: 'errorInvalidEmail',
  PASSWORD_TOO_SHORT: 'errorPasswordTooShort',
  PASSWORD_TOO_LONG: 'errorPasswordTooLong',
};

/** true si l'échec signifie « cet email a déjà un compte ». */
export function isExistingAccountError(code?: string): boolean {
  return code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' || code === 'USER_ALREADY_EXISTS';
}

/**
 * Clé i18n à afficher pour un code d'erreur Better Auth.
 * Les codes inconnus retombent sur un message générique ET sont loggés en
 * console : c'est ce qui rend diagnosticable un échec inattendu.
 */
export function authErrorKey(code?: string): string {
  const key = code ? ERROR_KEYS[code] : undefined;
  if (key) return key;
  console.error('[auth] code d’erreur non mappé :', code ?? '(aucun)');
  return 'errorGeneric';
}
