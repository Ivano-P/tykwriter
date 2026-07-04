import { timingSafeEqual } from 'node:crypto';

/**
 * Garde d'accès pour les routes API consommées hors du site (extension Chrome).
 * Deux protections complémentaires :
 *  - clé statique partagée (en-tête X-Correcteur-Key) — barrière de coût,
 *    pas une authentification réelle : la clé est extractible du bundle ;
 *  - limiteur de débit en mémoire (token bucket par IP) — suffisant pour un
 *    déploiement standalone mono-instance.
 */

const RATE_LIMIT_CAPACITY = 20; // jetons max (burst)
const RATE_LIMIT_REFILL_PER_MS = 20 / 60_000; // 20 requêtes / minute
const MAX_TRACKED_CLIENTS = 1_000;

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, TokenBucket>();

/** Comparaison à temps constant pour éviter les attaques par chronométrage. */
function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Vérifie la clé API de la requête contre CORRECTEUR_API_KEY.
 * Retourne null si la clé est valide, sinon un motif de refus.
 */
export function checkApiKey(request: Request): string | null {
  const expected = process.env.CORRECTEUR_API_KEY;
  if (!expected) {
    // Clé non configurée côté serveur : on refuse tout plutôt que d'exposer
    // un endpoint Mistral ouvert.
    return 'API key not configured on server.';
  }
  const provided = request.headers.get('x-correcteur-key');
  if (!provided || !safeEquals(provided, expected)) {
    return 'Invalid API key.';
  }
  return null;
}

/** Identifie le client par IP (derrière le reverse proxy Dokploy/Traefik). */
function clientId(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Consomme un jeton du bucket du client.
 * Retourne true si la requête est autorisée, false si le débit est dépassé.
 */
export function consumeRateLimit(request: Request): boolean {
  const id = clientId(request);
  const now = Date.now();

  let bucket = buckets.get(id);
  if (!bucket) {
    // Purge simple quand la table grossit (clients inactifs re-remplis à plein).
    if (buckets.size >= MAX_TRACKED_CLIENTS) {
      for (const [key, value] of buckets) {
        const refilled =
          value.tokens + (now - value.lastRefill) * RATE_LIMIT_REFILL_PER_MS;
        if (refilled >= RATE_LIMIT_CAPACITY) buckets.delete(key);
      }
    }
    bucket = { tokens: RATE_LIMIT_CAPACITY, lastRefill: now };
    buckets.set(id, bucket);
  }

  bucket.tokens = Math.min(
    RATE_LIMIT_CAPACITY,
    bucket.tokens + (now - bucket.lastRefill) * RATE_LIMIT_REFILL_PER_MS,
  );
  bucket.lastRefill = now;

  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}
