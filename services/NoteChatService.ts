import { and, asc, eq, inArray, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { noteChat } from '@/db/schema';

/** Un échange question/réponse du chat IA d'une note. */
export interface ChatExchange {
  id: string;
  question: string;
  answer: string;
  createdAt: string; // ISO
}

const RETENTION_DAYS = 90;

/**
 * Historique du chat IA des notes.
 * Rétention : le chat d'une note est purgé quand il n'a pas servi depuis
 * 90 jours (dernier échange trop ancien) — purge opportuniste au chargement.
 */
export class NoteChatService {
  static async list(userId: string, noteId: string): Promise<ChatExchange[]> {
    const rows = await db
      .select({
        id: noteChat.id,
        question: noteChat.question,
        answer: noteChat.answer,
        createdAt: noteChat.createdAt,
      })
      .from(noteChat)
      .where(and(eq(noteChat.userId, userId), eq(noteChat.noteId, noteId)))
      .orderBy(asc(noteChat.createdAt));
    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  }

  static async add(
    userId: string,
    noteId: string,
    question: string,
    answer: string,
  ): Promise<ChatExchange> {
    const rows = await db
      .insert(noteChat)
      .values({ userId, noteId, question, answer })
      .returning({
        id: noteChat.id,
        question: noteChat.question,
        answer: noteChat.answer,
        createdAt: noteChat.createdAt,
      });
    const row = rows[0];
    return { ...row, createdAt: row.createdAt.toISOString() };
  }

  static async deleteExchange(userId: string, id: string): Promise<void> {
    await db
      .delete(noteChat)
      .where(and(eq(noteChat.id, id), eq(noteChat.userId, userId)));
  }

  /**
   * Purge les chats inutilisés depuis plus de 90 jours : toutes les lignes
   * des notes dont le DERNIER échange est antérieur au seuil.
   */
  static async purgeStale(userId: string): Promise<void> {
    // ISO string et non Date : dans un fragment sql`` brut, drizzle ne
    // convertit pas les Date et postgres.js rejette le paramètre.
    const threshold = new Date(
      Date.now() - RETENTION_DAYS * 24 * 3600 * 1000,
    ).toISOString();
    const staleNotes = db
      .select({ noteId: noteChat.noteId })
      .from(noteChat)
      .where(eq(noteChat.userId, userId))
      .groupBy(noteChat.noteId)
      .having(lt(sql`max(${noteChat.createdAt})`, threshold));

    await db
      .delete(noteChat)
      .where(
        and(eq(noteChat.userId, userId), inArray(noteChat.noteId, staleNotes)),
      );
  }
}
