import StarterKit from '@tiptap/starter-kit';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details';
import Highlight from '@tiptap/extension-highlight';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { NodeRange } from '@tiptap/extension-node-range';
import { Placeholder } from '@tiptap/extensions';
import { common, createLowlight } from 'lowlight';
import type { AnyExtension } from '@tiptap/core';
import { ResizableImage } from './ResizableImage';
import { NoteLink } from './NoteLink';

const lowlight = createLowlight(common);

/**
 * Details étendu avec un attribut `level` (null = bloc dépliant simple,
 * 1-3 = titre dépliant façon Notion — le summary est stylé comme un h1/h2/h3
 * via [data-level] dans NoteEditor.module.css).
 */
const NoteDetails = Details.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      level: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute('data-level');
          return raw ? Number(raw) : null;
        },
        renderHTML: (attributes) =>
          attributes.level ? { 'data-level': String(attributes.level) } : {},
      },
    };
  },
});

/**
 * Extensions de l'éditeur de notes (Notion-like).
 * `getPlaceholder` est lu à chaque rendu — suit les changements de langue.
 */
export function buildNoteExtensions(getPlaceholder: () => string): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5] },
      // Remplacé par CodeBlockLowlight (coloration syntaxique).
      codeBlock: false,
    }),
    CodeBlockLowlight.configure({ lowlight }),
    Highlight,
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    // Bloc dépliable (titre dépliant) : <details>/<summary>.
    NoteDetails.configure({ persist: true, HTMLAttributes: { class: 'note-details' } }),
    DetailsSummary,
    DetailsContent,
    ResizableImage,
    NoteLink,
    // Sélection multi-blocs pendant le drag (poignée de déplacement).
    NodeRange,
    Placeholder.configure({
      placeholder: () => getPlaceholder(),
      includeChildren: false,
    }),
  ];
}
