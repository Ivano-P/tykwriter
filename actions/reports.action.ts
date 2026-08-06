'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { isValidAdminAuth } from '@/lib/adminAuth';
import { ReportService } from '@/services/ReportService';
import { StorageService } from '@/services/StorageService';
import {
  isReportStatus,
  sanitizeReportType,
  MAX_REPORT_ATTACHMENTS,
  type AdminReportItem,
  type ReportAttachment,
  type ReportItem,
  type ReportStatus,
} from '@/services/reportTypes';

/**
 * Contrôleur des signalements.
 * - Actions utilisateur : réservées aux connectés, scopées à leurs données.
 * - Actions admin : Basic Auth revalidée ici (défense en profondeur — le
 *   proxy protège /admin mais une Server Action reste invocable directement).
 */

const TITLE_MAX = 150;
const DESCRIPTION_MAX = 5000;
const REPLY_MAX = 5000;

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error('UNAUTHORIZED');
  return session.user.id;
}

async function requireAdmin(): Promise<void> {
  const h = await headers();
  if (!isValidAdminAuth(h.get('authorization'))) {
    throw new Error('UNAUTHORIZED');
  }
}

function assertId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !id || id.length > 64) {
    throw new Error('INVALID_ID');
  }
}

/**
 * Valide les captures jointes fournies par le client.
 * Transite en chaîne JSON (comme le contenu des notes) : la sérialisation des
 * arguments de Server Action est capricieuse avec les objets imbriqués.
 * Les URL doivent appartenir au bucket R2 : on n'accepte pas une URL arbitraire
 * qui serait ensuite affichée dans l'admin.
 */
function parseAttachments(attachmentsJson?: string): ReportAttachment[] {
  if (!attachmentsJson) return [];
  if (typeof attachmentsJson !== 'string' || attachmentsJson.length > 4000) {
    throw new Error('INVALID_ATTACHMENTS');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(attachmentsJson);
  } catch {
    throw new Error('INVALID_ATTACHMENTS');
  }
  if (!Array.isArray(parsed)) throw new Error('INVALID_ATTACHMENTS');
  if (parsed.length > MAX_REPORT_ATTACHMENTS) {
    throw new Error('TOO_MANY_ATTACHMENTS');
  }

  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');
  return parsed.map((entry) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error('INVALID_ATTACHMENTS');
    }
    const { url, key, name } = entry as Record<string, unknown>;
    if (typeof url !== 'string' || typeof key !== 'string') {
      throw new Error('INVALID_ATTACHMENTS');
    }
    if (!base || !url.startsWith(`${base}/`) || !key.startsWith('reports/')) {
      throw new Error('INVALID_ATTACHMENTS');
    }
    return {
      url,
      key,
      name:
        typeof name === 'string' && name.trim()
          ? name.trim().slice(0, 120)
          : 'capture',
    };
  });
}

/** Purge best-effort des captures d'un signalement (R2 peut être indisponible). */
async function purgeAttachments(reportId: string): Promise<void> {
  try {
    const keys = await ReportService.attachmentKeys(reportId);
    if (keys.length > 0) await StorageService.deleteKeys(keys);
  } catch {
    // Sans blocage : la suppression du signalement primerait de toute façon.
  }
}

/* ------------------------------ Utilisateur ------------------------------ */

export async function createReportAction(input: {
  type: string;
  title: string;
  description: string;
  /** Captures déjà envoyées sur R2, en chaîne JSON (voir parseAttachments). */
  attachmentsJson?: string;
}): Promise<ReportItem> {
  const userId = await requireUserId();

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const description =
    typeof input.description === 'string' ? input.description.trim() : '';
  if (!title || !description) throw new Error('INVALID_INPUT');

  return ReportService.create(userId, {
    type: sanitizeReportType(input.type),
    title: title.slice(0, TITLE_MAX),
    description: description.slice(0, DESCRIPTION_MAX),
    attachments: parseAttachments(input.attachmentsJson),
  });
}

export async function listMyReportsAction(): Promise<ReportItem[]> {
  const userId = await requireUserId();
  return ReportService.listForUser(userId);
}

export async function deleteMyReportAction(id: string): Promise<void> {
  const userId = await requireUserId();
  assertId(id);
  await purgeAttachments(id);
  await ReportService.deleteOwn(userId, id);
}

/* --------------------------------- Admin --------------------------------- */

export async function adminListReportsAction(
  status?: string,
): Promise<AdminReportItem[]> {
  await requireAdmin();
  return ReportService.listAll(
    isReportStatus(status) ? (status as ReportStatus) : undefined,
  );
}

export async function adminUpdateReportAction(
  id: string,
  data: { status?: string; adminReply?: string },
): Promise<void> {
  await requireAdmin();
  assertId(id);

  const patch: { status?: ReportStatus; adminReply?: string | null } = {};
  if (data.status !== undefined) {
    if (!isReportStatus(data.status)) throw new Error('INVALID_STATUS');
    patch.status = data.status;
  }
  if (data.adminReply !== undefined) {
    if (typeof data.adminReply !== 'string') throw new Error('INVALID_REPLY');
    const reply = data.adminReply.trim().slice(0, REPLY_MAX);
    patch.adminReply = reply.length > 0 ? reply : null;
  }

  await ReportService.update(id, patch);
  revalidatePath('/admin');
}

export async function adminDeleteReportAction(id: string): Promise<void> {
  await requireAdmin();
  assertId(id);
  await purgeAttachments(id);
  await ReportService.remove(id);
  revalidatePath('/admin');
}
