import { eq, sql, sum } from 'drizzle-orm';
import { db } from '@/db';
import { anonUsage } from '@/db/schema';

/**
 * Rate limiting des requêtes IA anonymes, compteurs en Postgres.
 * - Par IP : ANON_DAILY_LIMIT requêtes / jour (UTC).
 * - Global : GLOBAL_DAILY_LIMIT toutes IP confondues (kill-switch budget).
 * Les utilisateurs connectés ne passent pas par ce service (aucune limite).
 */
export class RateLimitService {
  static readonly ANON_DAILY_LIMIT = 20;
  static readonly GLOBAL_DAILY_LIMIT = 300;

  private static today(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  }

  /**
   * Consomme une requête pour cette IP.
   * Retourne false si la limite (IP ou globale) est atteinte.
   */
  static async consume(ip: string): Promise<boolean> {
    const day = this.today();

    const rows = await db
      .insert(anonUsage)
      .values({ day, ip, count: 1 })
      .onConflictDoUpdate({
        target: [anonUsage.day, anonUsage.ip],
        set: { count: sql`${anonUsage.count} + 1` },
      })
      .returning({ count: anonUsage.count });

    if ((rows[0]?.count ?? Infinity) > this.ANON_DAILY_LIMIT) {
      return false;
    }

    const totals = await db
      .select({ total: sum(anonUsage.count) })
      .from(anonUsage)
      .where(eq(anonUsage.day, day));
    const total = Number(totals[0]?.total ?? 0);

    return total <= this.GLOBAL_DAILY_LIMIT;
  }
}
