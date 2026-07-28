import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const MAX_ATTEMPTS = 10;
const RETRY_DELAY_MS = 3000;

/**
 * Applique les migrations Drizzle au démarrage du serveur (voir
 * instrumentation.ts). Idempotent : les migrations déjà appliquées sont
 * ignorées. Réessaie plusieurs fois — au boot d'un déploiement Dokploy, le
 * conteneur Postgres peut mettre quelques secondes à accepter les connexions.
 * En cas d'échec final : erreur loggée, le serveur démarre quand même (les
 * requêtes échoueront de façon visible dans les logs).
 */
export async function runMigrations(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn('[migrations] DATABASE_URL absent — migrations ignorées.');
    return;
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const client = postgres(url, { max: 1, onnotice: () => {} });
    try {
      await migrate(drizzle(client), { migrationsFolder: './db/migrations' });
      console.log('[migrations] Schéma à jour.');
      await client.end();
      return;
    } catch (error) {
      lastError = error;
      await client.end({ timeout: 1 }).catch(() => {});
      if (attempt < MAX_ATTEMPTS) {
        console.warn(
          `[migrations] Tentative ${attempt}/${MAX_ATTEMPTS} échouée, nouvel essai dans ${RETRY_DELAY_MS / 1000}s…`,
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }
  console.error('[migrations] ÉCHEC après plusieurs tentatives :', lastError);
}
