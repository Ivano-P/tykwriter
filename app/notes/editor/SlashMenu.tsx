'use client';

import { forwardRef, useImperativeHandle, useState } from 'react';
import type { SuggestionProps } from '@tiptap/suggestion';
import type { SlashItem } from './SlashCommand';
import styles from './SlashMenu.module.css';

export interface SlashMenuHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

type Props = Pick<SuggestionProps<SlashItem, SlashItem>, 'items' | 'command'>;

/** Menu flottant de la commande « / » (navigation clavier + clic). */
export const SlashMenu = forwardRef<SlashMenuHandle, Props>(function SlashMenu(
  { items, command },
  ref,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Réinitialise la sélection quand la liste filtrée change (pattern React
  // « adjusting state when props change » — pas d'effet nécessaire).
  const [prevItems, setPrevItems] = useState(items);
  if (prevItems !== items) {
    setPrevItems(items);
    setSelectedIndex(0);
  }

  const select = (index: number) => {
    const item = items[index];
    if (item) command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        setSelectedIndex((prev) => (prev + 1) % items.length);
        return true;
      }
      if (event.key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === 'Enter') {
        select(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) return null;

  return (
    <div className={styles.menu}>
      {items.map((item, index) => {
        const showGroup = index === 0 || item.group !== items[index - 1].group;
        return (
          <div key={item.key}>
            {showGroup && <div className={styles.group}>{item.group}</div>}
            <button
              className={`${styles.item} ${index === selectedIndex ? styles.itemActive : ''}`}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => select(index)}
            >
              {item.label}
            </button>
          </div>
        );
      })}
    </div>
  );
});
