'use client';

import { BubbleMenu } from '@tiptap/react/menus';
import { useEditorState, type Editor } from '@tiptap/react';
import {
  Bold,
  Code,
  Highlighter,
  Italic,
  Strikethrough,
  Underline,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import styles from './EditorBubbleMenu.module.css';

interface Props {
  editor: Editor;
}

/** Menu flottant de mise en forme du texte sélectionné. */
export function EditorBubbleMenu({ editor }: Props) {
  const t = useTranslations('notes');

  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      highlight: e.isActive('highlight'),
      code: e.isActive('code'),
    }),
  });

  const button = (
    key: keyof typeof active,
    label: string,
    icon: React.ReactNode,
    toggle: () => void,
  ) => (
    <button
      className={`${styles.button} ${active[key] ? styles.buttonActive : ''}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );

  return (
    <BubbleMenu editor={editor} options={{ placement: 'top', offset: 8 }}>
      <div className={styles.menu}>
        {button('bold', t('bold'), <Bold size={16} />, () =>
          editor.chain().focus().toggleBold().run(),
        )}
        {button('italic', t('italic'), <Italic size={16} />, () =>
          editor.chain().focus().toggleItalic().run(),
        )}
        {button('underline', t('underline'), <Underline size={16} />, () =>
          editor.chain().focus().toggleUnderline().run(),
        )}
        {button('strike', t('strike'), <Strikethrough size={16} />, () =>
          editor.chain().focus().toggleStrike().run(),
        )}
        {button('highlight', t('highlight'), <Highlighter size={16} />, () =>
          editor.chain().focus().toggleHighlight().run(),
        )}
        {button('code', t('inlineCode'), <Code size={16} />, () =>
          editor.chain().focus().toggleCode().run(),
        )}
      </div>
    </BubbleMenu>
  );
}
