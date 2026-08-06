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
  // En développement, l'app peut être ouverte sur un port arbitraire
  // (`next dev` en autoPort) ou via 127.0.0.1 / [::1] au lieu de localhost
  // alors que BETTER_AUTH_URL pointe sur localhost:3000 → « Invalid origin »,
  // qui remonte à l'écran en erreur générique. On fait donc confiance à la
  // machine locale sous toutes ses formes. En production l'option n'est pas
  // posée du tout : seule BETTER_AUTH_URL est acceptée.
  ...(process.env.NODE_ENV !== 'production'
    ? {
        trustedOrigins: [
          'http://localhost:*',
          'http://127.0.0.1:*',
          'http://[::1]:*',
        ],
      }
    : {}),
  emailAndPassword: {
    enabled: true,
    // Mot de passe oublié : lien envoyé par email (SMTP du domaine).
    sendResetPassword: async ({ user, url }) => {
      const { EmailService } = await import('@/services/EmailService');
      await EmailService.sendPasswordReset(user.email, url);
    },
    resetPasswordTokenExpiresIn: 3600, // 1 h
  },
  user: {
    deleteUser: {
      enabled: true,
      // Les lignes DB (notes, dossiers, sessions, comptes) tombent par FK
      // cascade ; il reste à purger les images R2 de l'utilisateur.
      afterDelete: async (user) => {
        try {
          const { StorageService } = await import('@/services/StorageService');
          await StorageService.deleteByPrefix(`notes/${user.id}/`);
        } catch {
          // R2 non configuré ou purge échouée : ne bloque pas la suppression.
        }
      },
    },
  },
  // nextCookies doit rester le DERNIER plugin (gestion des cookies dans les
  // Server Actions / Route Handlers Next.js).
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
