import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { RateLimitService } from '@/services/RateLimitService';

/**
 * Garde des points d'entrée IA du site : les utilisateurs connectés passent
 * sans limite ; les anonymes consomment leur quota journalier par IP.
 */

function ipFromHeaders(h: Headers): string {
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return h.get('x-real-ip') ?? 'local';
}

/**
 * Retourne true si la requête peut consommer de l'IA, false si l'anonyme a
 * épuisé son quota. À appeler au début des Server Actions et routes IA du
 * site (l'API extension Chrome garde son propre système, voir lib/apiGuard).
 */
export async function allowAiRequest(): Promise<boolean> {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (session) return true;
  return RateLimitService.consume(ipFromHeaders(h));
}
