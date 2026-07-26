import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/db';
import * as schema from '@/db/schema';

/**
 * Better Auth (lib open-source, auto-hébergée) sur Postgres via Drizzle.
 * Secret et URL lus automatiquement depuis BETTER_AUTH_SECRET / BETTER_AUTH_URL.
 * Pas de vérification email pour l'instant (SMTP à venir).
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: {
    enabled: true,
  },
  // nextCookies doit rester le DERNIER plugin (gestion des cookies dans les
  // Server Actions / Route Handlers Next.js).
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
