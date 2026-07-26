import StarterKit from '@tiptap/starter-kit';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { Placeholder } from '@tiptap/extensions';
import { common, createLowlight } from 'lowlight';
import type { AnyExtension } from '@tiptap/core';

const lowlight = createLowlight(common);

/**
 * Extensions de l'éditeur de notes (Notion-like).
 * `placeholder` et `detailsSummaryPlaceholder` sont fournis localisés par l'appelant.
 */
export function buildNoteExtensions(placeholder: string): AnyExtension[] {
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
    Details.configure({ persist: true, HTMLAttributes: { class: 'note-details' } }),
    DetailsSummary,
    DetailsContent,
    Image,
    Placeholder.configure({
      placeholder,
      includeChildren: false,
    }),
  ];
}
