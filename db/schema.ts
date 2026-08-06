import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Schéma Drizzle.
 * Les 4 premières tables (user, session, account, verification) suivent le
 * schéma standard de Better Auth : les noms d'exports ET de champs doivent
 * correspondre à ce que l'adaptateur Drizzle de Better Auth attend.
 */

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/* ------------------------- Tables applicatives ------------------------- */

export const folder = pgTable(
  'folder',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('folder_user_idx').on(t.userId)],
);

/**
 * Signalements (bugs / suggestions) façon « issues » GitHub.
 * Créés par les utilisateurs connectés, traités depuis /admin.
 * Supprimés avec le compte (cascade) comme le reste des données utilisateur.
 */
export const report = pgTable(
  'report',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // 'bug' | 'suggestion' | 'question'
    type: text('type').notNull().default('bug'),
    title: text('title').notNull(),
    description: text('description').notNull(),
    // 'open' | 'in_progress' | 'resolved' | 'closed'
    status: text('status').notNull().default('open'),
    /** Réponse publique de l'admin, visible par l'auteur du signalement. */
    adminReply: text('admin_reply'),
    /** Captures d'écran jointes : [{ url, key, name }] stockées sur R2. */
    attachments: jsonb('attachments'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('report_user_idx').on(t.userId, t.createdAt),
    index('report_status_idx').on(t.status, t.createdAt),
  ],
);

/**
 * Historique du chat IA d'une note : un enregistrement = un échange
 * question/réponse. Purgé après 90 jours sans activité sur le chat de la note.
 */
export const noteChat = pgTable(
  'note_chat',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    noteId: uuid('note_id')
      .notNull()
      .references(() => note.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('note_chat_note_idx').on(t.noteId, t.createdAt)],
);

/** Compteur journalier des requêtes IA anonymes (rate limiting par IP). */
export const anonUsage = pgTable(
  'anon_usage',
  {
    day: text('day').notNull(), // YYYY-MM-DD (UTC)
    ip: text('ip').notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.day, t.ip] })],
);

export const note = pgTable(
  'note',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Note sans dossier = à la racine de la sidebar.
    folderId: uuid('folder_id').references(() => folder.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull().default(''),
    // Document TipTap complet (JSON ProseMirror).
    content: jsonb('content'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('note_user_idx').on(t.userId),
    index('note_user_updated_idx').on(t.userId, t.updatedAt),
  ],
);
