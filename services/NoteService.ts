import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { folder, note } from '@/db/schema';

/** Métadonnées d'une note (liste sidebar — sans le contenu, volumineux). */
export interface NoteMeta {
  id: string;
  title: string;
  folderId: string | null;
  updatedAt: string; // ISO
}

export interface NoteFull extends NoteMeta {
  content: Record<string, unknown> | null;
}

export interface FolderMeta {
  id: string;
  name: string;
  position: number;
}

export interface NoteUpdate {
  title?: string;
  content?: Record<string, unknown>;
  folderId?: string | null;
}

/**
 * Logique métier des notes et dossiers.
 * Toutes les méthodes sont scopées par userId : une requête ne peut jamais
 * lire ou modifier les données d'un autre utilisateur.
 */
export class NoteService {
  static async listForUser(
    userId: string,
  ): Promise<{ folders: FolderMeta[]; notes: NoteMeta[] }> {
    const [folders, notes] = await Promise.all([
      db
        .select({ id: folder.id, name: folder.name, position: folder.position })
        .from(folder)
        .where(eq(folder.userId, userId))
        .orderBy(asc(folder.position), asc(folder.createdAt)),
      db
        .select({
          id: note.id,
          title: note.title,
          folderId: note.folderId,
          updatedAt: note.updatedAt,
        })
        .from(note)
        .where(eq(note.userId, userId))
        .orderBy(desc(note.updatedAt)),
    ]);

    return {
      folders,
      notes: notes.map((n) => ({ ...n, updatedAt: n.updatedAt.toISOString() })),
    };
  }

  static async getNote(userId: string, id: string): Promise<NoteFull | null> {
    const rows = await db
      .select()
      .from(note)
      .where(and(eq(note.id, id), eq(note.userId, userId)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      folderId: row.folderId,
      content: (row.content as Record<string, unknown> | null) ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  static async createNote(
    userId: string,
    folderId: string | null,
  ): Promise<NoteMeta> {
    // Vérifie que le dossier cible appartient bien à l'utilisateur.
    if (folderId && !(await this.ownsFolder(userId, folderId))) {
      folderId = null;
    }
    const rows = await db
      .insert(note)
      .values({ userId, folderId, title: '' })
      .returning({
        id: note.id,
        title: note.title,
        folderId: note.folderId,
        updatedAt: note.updatedAt,
      });
    const row = rows[0];
    return { ...row, updatedAt: row.updatedAt.toISOString() };
  }

  static async updateNote(
    userId: string,
    id: string,
    data: NoteUpdate,
  ): Promise<NoteMeta | null> {
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) values.title = data.title;
    if (data.content !== undefined) values.content = data.content;
    if (data.folderId !== undefined) {
      values.folderId =
        data.folderId && (await this.ownsFolder(userId, data.folderId))
          ? data.folderId
          : null;
    }

    const rows = await db
      .update(note)
      .set(values)
      .where(and(eq(note.id, id), eq(note.userId, userId)))
      .returning({
        id: note.id,
        title: note.title,
        folderId: note.folderId,
        updatedAt: note.updatedAt,
      });
    const row = rows[0];
    if (!row) return null;
    return { ...row, updatedAt: row.updatedAt.toISOString() };
  }

  static async deleteNote(userId: string, id: string): Promise<void> {
    await db.delete(note).where(and(eq(note.id, id), eq(note.userId, userId)));
  }

  static async createFolder(userId: string, name: string): Promise<FolderMeta> {
    const rows = await db
      .insert(folder)
      .values({ userId, name })
      .returning({ id: folder.id, name: folder.name, position: folder.position });
    return rows[0];
  }

  static async renameFolder(
    userId: string,
    id: string,
    name: string,
  ): Promise<void> {
    await db
      .update(folder)
      .set({ name, updatedAt: new Date() })
      .where(and(eq(folder.id, id), eq(folder.userId, userId)));
  }

  /** Supprime le dossier ; ses notes reviennent à la racine (FK set null). */
  static async deleteFolder(userId: string, id: string): Promise<void> {
    await db
      .delete(folder)
      .where(and(eq(folder.id, id), eq(folder.userId, userId)));
  }

  private static async ownsFolder(
    userId: string,
    folderId: string,
  ): Promise<boolean> {
    const rows = await db
      .select({ id: folder.id })
      .from(folder)
      .where(and(eq(folder.id, folderId), eq(folder.userId, userId)))
      .limit(1);
    return rows.length > 0;
  }
}
