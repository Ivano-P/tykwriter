'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

interface TiptapEditorProps {
  globalText: string;
  setGlobalText: (text: string) => void;
  isProcessing?: boolean;
  maxLength?: number;
  className?: string;
}

export function TiptapEditor({
  globalText,
  setGlobalText,
  isProcessing = false,
  maxLength = 2000,
  className = '',
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: globalText,
    editable: !isProcessing,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `focus:outline-none ${className}`,
      },
    },
    onUpdate: ({ editor }) => {
      // Extract text content only since we just want to replace the textarea behavior,
      // or optionally keep HTML if you want rich text formatting in the future.
      // For now we sync the text content to keep spellcheck working exactly as before.
      let text = editor.getText();
      if (maxLength && text.length > maxLength) {
        text = text.substring(0, maxLength);
        // We technically shouldn't truncate after the fact like this directly without updating editor,
        // but for a simple integration we pass the truncated text up.
        // A prosemirror plugin would be needed for hard char limits, but this matches the textarea.
      }
      setGlobalText(text);
    },
  });

  // Sync external changes (like undo/redo or corrections) into the editor
  useEffect(() => {
    if (editor && globalText !== editor.getText()) {
      editor.commands.setContent(globalText);
    }
  }, [globalText, editor]);

  // Sync disabled state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isProcessing);
    }
  }, [isProcessing, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`tiptap-wrapper w-full h-full flex flex-col ${className}`}>
      <EditorContent editor={editor} className="w-full h-full flex-grow outline-none prose prose-sm max-w-none" />
    </div>
  );
}
