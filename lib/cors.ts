/**
 * Aide CORS pour les routes API appelées depuis l'extension Chrome.
 * Les origines autorisées viennent de CORRECTEUR_ALLOWED_ORIGINS
 * (liste séparée par des virgules, ex. "chrome-extension://abc,chrome-extension://def" —
 * l'ID diffère entre la version dev non empaquetée et celle du Chrome Web Store).
 */

function allowedOrigins(): string[] {
  return (process.env.CORRECTEUR_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

/**
 * Retourne les en-têtes CORS à joindre à la réponse si l'origine de la
 * requête est autorisée, sinon un objet vide (pas d'en-têtes = refus CORS).
 */
export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  if (!origin || !allowedOrigins().includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Correcteur-Key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
