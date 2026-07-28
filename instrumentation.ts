/**
 * Hook de démarrage Next.js : exécuté une fois au boot du serveur
 * (pas pendant `next build`). Applique les migrations Drizzle — indispensable
 * sur Dokploy où la DB n'est pas accessible depuis la machine de dev.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runMigrations } = await import('./db/migrate');
    await runMigrations();
  }
}
