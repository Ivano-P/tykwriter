import { Extension, type Editor, type Range } from '@tiptap/core';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';

export interface SlashItem {
  key: string;
  label: string;
  /** Groupe d'affichage (titres, blocs, …) — libellé déjà localisé. */
  group: string;
  command: (ctx: { editor: Editor; range: Range }) => void;
}

/**
 * Commande « / » : ouvre un menu d'insertion de blocs (type Notion).
 * La liste des items et le rendu du menu sont fournis via `configure()`
 * (les libellés localisés vivent côté React).
 */
export const SlashCommand = Extension.create<{
  suggestion: Partial<SuggestionOptions<SlashItem, SlashItem>>;
}>({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        allowSpaces: false,
        startOfLine: false,
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

/** Fabrique la liste d'items du menu « / » à partir de libellés localisés. */
export function buildSlashItems(labels: {
  groups: { headings: string; blocks: string; inserts: string };
  text: string;
  h1: string;
  h2: string;
  h3: string;
  h4: string;
  h5: string;
  bulletList: string;
  orderedList: string;
  taskList: string;
  toggle: string;
  quote: string;
  codeBlock: string;
  table: string;
  divider: string;
  image: string;
}): SlashItem[] {
  const heading = (level: 1 | 2 | 3 | 4 | 5, label: string): SlashItem => ({
    key: `h${level}`,
    label,
    group: labels.groups.headings,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level }).run(),
  });

  return [
    {
      key: 'text',
      label: labels.text,
      group: labels.groups.blocks,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setParagraph().run(),
    },
    heading(1, labels.h1),
    heading(2, labels.h2),
    heading(3, labels.h3),
    heading(4, labels.h4),
    heading(5, labels.h5),
    {
      key: 'bulletList',
      label: labels.bulletList,
      group: labels.groups.blocks,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      key: 'orderedList',
      label: labels.orderedList,
      group: labels.groups.blocks,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      key: 'taskList',
      label: labels.taskList,
      group: labels.groups.blocks,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleTaskList().run(),
    },
    {
      key: 'toggle',
      label: labels.toggle,
      group: labels.groups.blocks,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setDetails().run(),
    },
    {
      key: 'quote',
      label: labels.quote,
      group: labels.groups.blocks,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      key: 'codeBlock',
      label: labels.codeBlock,
      group: labels.groups.blocks,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
      key: 'table',
      label: labels.table,
      group: labels.groups.inserts,
      command: ({ editor, range }) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),
    },
    {
      key: 'divider',
      label: labels.divider,
      group: labels.groups.inserts,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
    {
      key: 'image',
      label: labels.image,
      group: labels.groups.inserts,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        // Le NoteEditor écoute cet événement et ouvre le sélecteur de fichier.
        document.dispatchEvent(new CustomEvent('tykwriter:pick-image'));
      },
    },
  ];
}

/** Filtre les items par la requête tapée après le « / ». */
export function filterSlashItems(items: SlashItem[], query: string): SlashItem[] {
  const q = query.toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) => item.label.toLowerCase().includes(q) || item.key.toLowerCase().includes(q),
  );
}
