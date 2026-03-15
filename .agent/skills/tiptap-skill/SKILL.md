# SKILL: Tiptap & ProseMirror Architecture

When working on the Tiptap editor in this project, strictly follow these architectural rules:

1. CORE CONCEPTS:
- Tiptap is a headless wrapper around ProseMirror.
- State is immutable. Never modify the DOM directly using standard React refs or vanilla JS (no `document.getElementById`).
- "Nodes" are blocks (paragraphs, headings). "Marks" are inline formatting (bold, italic, or custom highlights).

2. REACT INTEGRATION:
- We use `@tiptap/react`.
- The editor is instantiated with the `useEditor` hook.
- The UI is rendered using the `<EditorContent editor={editor} />` component.

3. EXECUTING COMMANDS:
- Always use the chainable API for commands to ensure transactions are dispatched correctly.
- Example: `editor.chain().focus().toggleBold().run()`

4. CUSTOM HIGHLIGHTING / SQUIGGLY LINES (For the Grammar Checker):
- To underline specific words based on exact text matches (like LanguageTool), DO NOT use standard HTML wrappers.
- You must create a custom Tiptap Extension or use ProseMirror `Decorations` (via a Plugin).
- The Decoration approach is preferred for grammar checking because it doesn't alter the actual JSON/HTML schema of the document; it only changes how it renders visually.