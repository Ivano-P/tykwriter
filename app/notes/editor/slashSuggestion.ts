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
 * Configuration `suggestion` du menu « / » : filtrage des items et rendu
 * du menu React positionné sous le curseur.
 */
export function createSlashSuggestion(
  labels: SlashLabels,
): Partial<SuggestionOptions<SlashItem, SlashItem>> {
  const allItems = buildSlashItems(labels);

  return {
    items: ({ query }) => filterSlashItems(allItems, query),

    render: () => {
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
    },
  };
}
