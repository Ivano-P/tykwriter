/**
 * Validation Basic Auth de la page d'administration, partagée entre proxy.ts
 * (barrière de routage) et les Server Actions admin (défense en profondeur).
 * Compatible runtime Edge : pas de node:crypto, comparaison à temps constant
 * implémentée à la main.
 */

function timingSafeEqualStr(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/** true si les identifiants admin sont configurés côté serveur. */
export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_USER && process.env.ADMIN_PASS);
}

/** Valide un en-tête Authorization « Basic … » contre ADMIN_USER/ADMIN_PASS. */
export function isValidAdminAuth(header: string | null): boolean {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASS;
  if (!user || !pass) return false;
  if (!header || !header.startsWith('Basic ')) return false;

  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const sep = decoded.indexOf(':');
  if (sep === -1) return false;

  const userOk = timingSafeEqualStr(decoded.slice(0, sep), user);
  const passOk = timingSafeEqualStr(decoded.slice(sep + 1), pass);
  return userOk && passOk;
}
