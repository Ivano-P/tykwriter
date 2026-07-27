import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL manquant dans .env');
}

/**
 * Client Postgres partagé (postgres.js).
 * `max: 10` suffit largement pour une instance Next.js unique (Dokploy).
 */
const client = postgres(process.env.DATABASE_URL, { max: 10 });

export const db = drizzle(client, { schema });
