'use client';

import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useEffect, useRef } from 'react';
import { CorrectionIssue } from '@/services/MistralAiProService';

interface TiptapEditorProps {
  globalText: string;
  setGlobalText: (text: string) => void;
  isProcessing?: boolean;
  maxLength?: number;
  className?: string;
  correctionIssues?: CorrectionIssue[];
  applyCorrection?: (issue: CorrectionIssue, source: 'sidebar' | 'editor') => void;
}

export function TiptapEditor({
  globalText,
  setGlobalText,
  isProcessing = false,
  maxLength = 2000,
  className = '',
  correctionIssues = [],
  applyCorrection,
}: TiptapEditorProps) {
  const issuesRef = useRef(correctionIssues);
  const applyCorrectionRef = useRef(applyCorrection);
  const isExternalUpdate = useRef(false);
  const latestGlobalTextRef = useRef(globalText);

  useEffect(() => {
    issuesRef.current = correctionIssues;
    applyCorrectionRef.current = applyCorrection;
    latestGlobalTextRef.current = globalText; // Keep ref updated
    if (editor) {
      // Force ProseMirror to re-execute the plugin's apply method
      editor.view.dispatch(editor.state.tr.setMeta('updateCorrections', true));
    }
  }, [correctionIssues, applyCorrection, globalText]); // eslint-disable-line react-hooks/exhaustive-deps

  const CorrectionHighlighter = Extension.create({
    name: 'correctionHighlighter',

    addProseMirrorPlugins() {
      const pluginKey = new PluginKey('correctionHighlighter');

      return [
        new Plugin({
          key: pluginKey,
          state: {
            init() {
              return DecorationSet.empty;
            },
            apply(tr, oldState) {
              const issues = issuesRef.current;
              const { doc } = tr;
              if (!issues || issues.length === 0) {
                return DecorationSet.empty;
              }

              const decorations: Decoration[] = [];

              doc.descendants((node, pos) => {
                if (node.isText && node.text) {
                  issues.forEach((issue, index) => {
                    const textToFind = issue.texte_original;
                    if (!textToFind) return;

                    let startIndex = 0;
                    let matchIndex;
                    while ((matchIndex = node.text!.indexOf(textToFind, startIndex)) > -1) {
                      const from = pos + matchIndex;
                      const to = from + textToFind.length;

                      decorations.push(
                        Decoration.inline(from, to, {
                          class: 'border-b-2 border-[var(--destructive)] bg-[var(--destructive)]/10 text-[var(--destructive)] cursor-pointer',
                          'data-correction-index': index.toString()
                        })
                      );

                      startIndex = matchIndex + textToFind.length;
                    }
                  });
                }
              });
              return DecorationSet.create(doc, decorations);
            }
          },
          props: {
            decorations(state) {
              return pluginKey.getState(state);
            },
            handleClick(view, pos, event) {
              const target = event.target as HTMLElement;
              // Check if we clicked on a correction highlight
              if (target && target.hasAttribute('data-correction-index')) {
                const indexStr = target.getAttribute('data-correction-index');
                if (indexStr !== null) {
                  const issue = issuesRef.current[parseInt(indexStr, 10)];
                  const applyFn = applyCorrectionRef.current;

                  if (issue && applyFn) {
                    // Find the exact decoration bounds
                    const state = view.state;
                    const decos = pluginKey.getState(state) as DecorationSet;
                    const found = decos.find(pos, pos);

                    const deco = found.find(d => {
                      return d.spec['data-correction-index'] === indexStr;
                    });

                    if (deco) {
                      // Perform Replacement using ProseMirror transaction
                      const tr = state.tr.insertText(issue.correction, deco.from, deco.to);
                      view.dispatch(tr);

                      // Notify parent
                      applyFn(issue, 'editor');
                    }
                    return true;
                  }
                }
              }
              return false;
            }
          }
        })
      ];
    }
  });

  const editor = useEditor({
    extensions: [StarterKit, CorrectionHighlighter],
    content: globalText,
    editable: !isProcessing,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `focus:outline-none overflow-y-auto flex-1 h-full w-full ${className}`,
      },
    },
    onUpdate: ({ editor, transaction }) => {
      if (!transaction.docChanged) return;
      
      if (isExternalUpdate.current) {
        isExternalUpdate.current = false;
        return;
      }
      let text = editor.getText();
      if (maxLength && text.length > maxLength) {
        text = text.substring(0, maxLength);
      }
      
      // Prevent cyclic updates or re-formatting from triggering an unnecessary state change
      if (text === latestGlobalTextRef.current) {
        return;
      }
      
      setGlobalText(text);
    },
  });

  // Sync external changes (like undo/redo or corrections from sidebar) into the editor
  useEffect(() => {
    if (editor && globalText !== editor.getText()) {
      isExternalUpdate.current = true;
      // Syncing via setContent can reset cursor but it works flawlessly for simple textarea replacements
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
    <div className={`tiptap-wrapper w-full h-full flex flex-col overflow-hidden min-h-0 ${className}`}>
      <EditorContent editor={editor} className="w-full flex-1 flex flex-col overflow-hidden min-h-0 outline-none prose prose-sm max-w-none" />
    </div>
  );
}
