import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { report, user } from '@/db/schema';
import {
  isReportStatus,
  sanitizeReportType,
  type AdminReportItem,
  type ReportCounts,
  type ReportItem,
  type ReportStatus,
  type ReportType,
} from './reportTypes';

/**
 * Signalements (bugs / suggestions).
 * Les méthodes « utilisateur » sont scopées par userId ; les méthodes admin
 * voient tous les signalements (l'appelant vérifie l'authentification admin).
 * Types et constantes : services/reportTypes.ts (importable côté client).
 */
export class ReportService {
  static async listForUser(userId: string): Promise<ReportItem[]> {
    const rows = await db
      .select()
      .from(report)
      .where(eq(report.userId, userId))
      .orderBy(desc(report.createdAt));
    return rows.map(toReportItem);
  }

  static async create(
    userId: string,
    data: { type: ReportType; title: string; description: string },
  ): Promise<ReportItem> {
    const rows = await db
      .insert(report)
      .values({
        userId,
        type: data.type,
        title: data.title,
        description: data.description,
      })
      .returning();
    return toReportItem(rows[0]);
  }

  /** Suppression par l'auteur (son propre signalement uniquement). */
  static async deleteOwn(userId: string, id: string): Promise<void> {
    await db
      .delete(report)
      .where(and(eq(report.id, id), eq(report.userId, userId)));
  }

  /* ------------------------------- Admin ------------------------------- */

  static async listAll(status?: ReportStatus): Promise<AdminReportItem[]> {
    const rows = await db
      .select({
        r: report,
        authorName: user.name,
        authorEmail: user.email,
      })
      .from(report)
      .innerJoin(user, eq(user.id, report.userId))
      .where(status ? eq(report.status, status) : undefined)
      .orderBy(desc(report.createdAt));

    return rows.map(({ r, authorName, authorEmail }) => ({
      ...toReportItem(r),
      authorName,
      authorEmail,
    }));
  }

  static async countsByStatus(): Promise<ReportCounts> {
    const rows = await db
      .select({ status: report.status, count: sql<number>`count(*)::int` })
      .from(report)
      .groupBy(report.status);

    const counts: ReportCounts = {
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
    };
    for (const row of rows) {
      if (isReportStatus(row.status)) counts[row.status] = Number(row.count);
    }
    return counts;
  }

  static async update(
    id: string,
    data: { status?: ReportStatus; adminReply?: string | null },
  ): Promise<void> {
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (data.status !== undefined) values.status = data.status;
    if (data.adminReply !== undefined) values.adminReply = data.adminReply;
    await db.update(report).set(values).where(eq(report.id, id));
  }

  static async remove(id: string): Promise<void> {
    await db.delete(report).where(eq(report.id, id));
  }
}

type ReportRow = typeof report.$inferSelect;

function toReportItem(row: ReportRow): ReportItem {
  return {
    id: row.id,
    type: sanitizeReportType(row.type),
    title: row.title,
    description: row.description,
    status: isReportStatus(row.status) ? row.status : 'open',
    adminReply: row.adminReply,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
