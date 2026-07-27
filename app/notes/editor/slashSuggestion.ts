import { ReactRenderer } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import {
  buildSlashItems,
  filterSlashItems,
  type SlashItem,
} from './SlashCommand';
import { SlashMenu, type SlashMenuHandle } from './SlashMenu';

type SlashLabels = Parameters<typeof buildSlashItems>[0];

/**
 * Rendu générique d'un menu de suggestion (utilisé par le menu « / » et par
 * le menu « @ » des liens entre notes) : SlashMenu React positionné sous le
 * curseur, navigation clavier déléguée au composant.
 */
export function createSuggestionRender(): NonNullable<
  SuggestionOptions<SlashItem, SlashItem>['render']
> {
  return () => {
    let component: ReactRenderer<SlashMenuHandle> | null = null;

    const position = (props: SuggestionProps<SlashItem, SlashItem>) => {
      if (!component) return;
      const el = component.element as HTMLElement;
      const rect = props.clientRect?.();
      if (!rect) return;
      el.style.position = 'fixed';
      el.style.zIndex = '60';
      el.style.left = `${rect.left}px`;
      // Sous le curseur, ou au-dessus si pas la place.
      const menuHeight = el.offsetHeight || 320;
      const below = rect.bottom + 6;
      const top =
        below + menuHeight > window.innerHeight
          ? Math.max(8, rect.top - menuHeight - 6)
          : below;
      el.style.top = `${top}px`;
    };

    return {
      onStart: (props) => {
        component = new ReactRenderer(SlashMenu, {
          props,
          editor: props.editor as Editor,
        });
        document.body.appendChild(component.element);
        position(props);
      },
      onUpdate: (props) => {
        component?.updateProps(props);
        position(props);
      },
      onKeyDown: ({ event }) => {
        if (event.key === 'Escape') {
          component?.destroy();
          component?.element.remove();
          component = null;
          return true;
        }
        return component?.ref?.onKeyDown(event) ?? false;
      },
      onExit: () => {
        component?.element.remove();
        component?.destroy();
        component = null;
      },
    };
  };
}

/** Configuration `suggestion` du menu « / » : filtrage des items + rendu. */
export function createSlashSuggestion(
  labels: SlashLabels,
): Partial<SuggestionOptions<SlashItem, SlashItem>> {
  const allItems = buildSlashItems(labels);

  return {
    items: ({ query }) => filterSlashItems(allItems, query),
    render: createSuggestionRender(),
  };
}

/**
 * Configuration `suggestion` du menu « @ » : liens vers d'autres notes.
 * `getNotes` lit la liste courante (ref côté React) — la note ouverte est
 * exclue par l'appelant.
 */
export function createNoteLinkSuggestion(
  getNotes: () => { id: string; title: string }[],
  labels: { group: string; untitled: string },
): Partial<SuggestionOptions<SlashItem, SlashItem>> {
  return {
    char: '@',
    items: ({ query }) => {
      const q = query.toLowerCase();
      return getNotes()
        .filter(
          (n) => !q || (n.title || labels.untitled).toLowerCase().includes(q),
        )
        .slice(0, 12)
        .map((n) => ({
          key: n.id,
          label: n.title || labels.untitled,
          group: labels.group,
          command: ({ editor, range }) => {
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .insertContent([
                {
                  type: 'noteLink',
                  attrs: { noteId: n.id, label: n.title || labels.untitled },
                },
                { type: 'text', text: ' ' },
              ])
              .run();
          },
        }));
    },
    render: createSuggestionRender(),
  };
}
