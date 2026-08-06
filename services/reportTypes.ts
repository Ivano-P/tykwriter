/**
 * Types et constantes des signalements — module PUR (aucun import DB) afin
 * d'être importable depuis les composants client. `ReportService` (accès
 * Postgres) s'appuie sur ce fichier ; ne jamais y importer `@/db`, sous peine
 * d'embarquer le driver postgres dans le bundle navigateur.
 */

/** Types de signalement proposés à l'utilisateur. */
export const REPORT_TYPES = ['bug', 'suggestion', 'question'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

/** Statuts de traitement (façon issues GitHub). */
export const REPORT_STATUSES = [
  'open',
  'in_progress',
  'resolved',
  'closed',
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export function sanitizeReportType(value: unknown): ReportType {
  return REPORT_TYPES.includes(value as ReportType)
    ? (value as ReportType)
    : 'bug';
}

export function isReportStatus(value: unknown): value is ReportStatus {
  return REPORT_STATUSES.includes(value as ReportStatus);
}

/** Capture d'écran jointe à un signalement (stockée sur Cloudflare R2). */
export interface ReportAttachment {
  /** URL publique servie par le domaine du bucket. */
  url: string;
  /** Clé R2, conservée pour pouvoir purger le fichier à la suppression. */
  key: string;
  /** Nom d'origine, utilisé comme nom de téléchargement. */
  name: string;
}

/** Nombre maximum de captures par signalement. */
export const MAX_REPORT_ATTACHMENTS = 5;

/** Signalement tel que vu par son auteur. */
export interface ReportItem {
  id: string;
  type: ReportType;
  title: string;
  description: string;
  status: ReportStatus;
  adminReply: string | null;
  attachments: ReportAttachment[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

/** Signalement enrichi de l'auteur, pour la vue admin. */
export interface AdminReportItem extends ReportItem {
  authorName: string;
  authorEmail: string;
}

/** Compteurs par statut affichés dans l'en-tête admin. */
export type ReportCounts = Record<ReportStatus, number>;
