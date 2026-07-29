import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type Db = ReturnType<typeof drizzle<typeof schema>>;

let instance: Db | null = null;

/**
 * Client Postgres paresseux : créé au premier accès, PAS à l'import.
 * Indispensable pour le build Docker (Dokploy n'injecte les variables
 * d'environnement qu'à l'exécution — « collecting page data » importe ce
 * module sans DATABASE_URL et ne doit pas planter).
 * `max: 10` suffit largement pour une instance Next.js unique (Dokploy).
 */
function getDb(): Db {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL manquant dans .env');
    }
    instance = drizzle(postgres(url, { max: 10 }), { schema });
  }
  return instance;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === 'function' ? (value as CallableFunction).bind(real) : value;
  },
});
