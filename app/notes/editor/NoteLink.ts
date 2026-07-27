import { mergeAttributes, Node } from '@tiptap/core';

/**
 * Lien interne vers une autre note (chip inline cliquable).
 * Le clic est géré dans NoteEditor (handleClickOn) qui émet
 * l'événement `tykwriter:open-note` écouté par NotesWorkspace.
 */
export const NoteLink = Node.create({
  name: 'noteLink',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      noteId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-note-id'),
        renderHTML: (attributes) => ({ 'data-note-id': attributes.noteId }),
      },
      label: {
        default: '',
        parseHTML: (element) => element.textContent,
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-note-link]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'a',
      mergeAttributes({ 'data-note-link': '', class: 'note-link' }, HTMLAttributes),
      `↗ ${node.attrs.label || ''}`,
    ];
  },
});
