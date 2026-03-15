'use client';

import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useEffect, useRef, useState } from 'react';
import { CorrectionIssue } from '@/services/MistralAiProService';

interface TiptapEditorProps {
  globalText: string;
  setGlobalText: (text: string) => void;
  isProcessing?: boolean;
  maxLength?: number;
  className?: string;
  correctionIssues?: CorrectionIssue[];
  applyCorrection?: (issue: CorrectionIssue, source: 'sidebar' | 'editor') => void;
  ignoreCorrection?: (issue: CorrectionIssue) => void;
}

interface PopupState {
  issue: CorrectionIssue;
  coords: { top: number; left: number };
  from: number;
  to: number;
}

export function TiptapEditor({
  globalText,
  setGlobalText,
  isProcessing = false,
  maxLength = 2000,
  className = '',
  correctionIssues = [],
  applyCorrection,
  ignoreCorrection,
}: TiptapEditorProps) {
  const issuesRef = useRef(correctionIssues);
  const applyCorrectionRef = useRef(applyCorrection);
  const ignoreCorrectionRef = useRef(ignoreCorrection);
  const isExternalUpdate = useRef(false);
  const latestGlobalTextRef = useRef(globalText);
  const [popup, setPopup] = useState<PopupState | null>(null);

  useEffect(() => {
    issuesRef.current = correctionIssues;
    applyCorrectionRef.current = applyCorrection;
    ignoreCorrectionRef.current = ignoreCorrection;
    latestGlobalTextRef.current = globalText; // Keep ref updated
    if (editor) {
      // Force ProseMirror to re-execute the plugin's apply method
      editor.view.dispatch(editor.state.tr.setMeta('updateCorrections', true));
      setPopup(null);
    }
  }, [correctionIssues, applyCorrection, ignoreCorrection, globalText]); // eslint-disable-line react-hooks/exhaustive-deps

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
                          'data-correction-id': issue.id
                        }, {
                          'data-correction-id': issue.id
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
              const target = event.target as Node;
              const element = (target.nodeType === 3 ? target.parentElement : target) as HTMLElement;
              const decoElement = element?.closest ? element.closest('[data-correction-id]') : null;
              
              if (decoElement) {
                const idStr = decoElement.getAttribute('data-correction-id');
                if (idStr) {
                  const issue = issuesRef.current.find(i => i.id === idStr);
                  const applyFn = applyCorrectionRef.current;

                  if (issue && applyFn) {
                    const state = view.state;
                    const decos = pluginKey.getState(state) as DecorationSet;
                    const allDecos = decos.find();
                    const deco = allDecos.find(d => d.spec['data-correction-id'] === idStr);

                    if (deco) {
                      const rect = decoElement.getBoundingClientRect();
                      const wrapper = document.querySelector('.tiptap-wrapper');
                      const wrapperRect = wrapper ? wrapper.getBoundingClientRect() : { top: 0, left: 0 };
                      
                      // Positionne la popup juste sous le mot cliqué
                      setPopup({
                        issue,
                        coords: {
                          top: rect.bottom - wrapperRect.top + 8,
                          left: Math.max(0, rect.left - wrapperRect.left - 20)
                        },
                        from: deco.from,
                        to: deco.to
                      });
                    }
                    return true;
                  }
                }
              }
              setPopup(null);
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
      
      setPopup(null);
      
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
    if (editor && globalText !== editor.getText() && !isExternalUpdate.current) {
      isExternalUpdate.current = true;
      // Syncing via setContent can reset cursor but it works flawlessly for simple textarea replacements
      editor.commands.setContent(globalText);
    }
  }, [globalText, editor]);

  // Listen for non-blocking seamless text replacements (from Assistant Rédacteur)
  useEffect(() => {
    if (!editor) return;

    const handleReplaceText = (e: Event) => {
      const customEvent = e as CustomEvent<{ oldText: string, newText: string }>;
      const { oldText, newText } = customEvent.detail;
      
      const trimmedOld = oldText.trim();
      const trimmedNew = newText.trim();
      if (!trimmedOld) return; // skip if purely whitespace
      
      let from = -1;
      let to = -1;
      
      editor.state.doc.descendants((node, pos) => {
        if (from !== -1) return false; // Early exit if found
        
        if (node.isBlock) {
          let blockText = '';
          const childPositions: { pos: number, textIndex: number }[] = [];
          
          node.descendants((child, childPos) => {
            if (child.isText && child.text) {
              childPositions.push({ pos: childPos, textIndex: blockText.length });
              blockText += child.text;
            } else if (child.type.name === 'hardBreak') {
              childPositions.push({ pos: childPos, textIndex: blockText.length });
              blockText += '\n';
            }
          });
          
          // Match the last occurrence since user types at the end usually
          const index = blockText.lastIndexOf(trimmedOld);
          if (index !== -1) {
            let mappedPos = -1;
            for (let i = childPositions.length - 1; i >= 0; i--) {
              if (index >= childPositions[i].textIndex) {
                mappedPos = childPositions[i].pos + (index - childPositions[i].textIndex);
                break;
              }
            }
            
            if (mappedPos !== -1) {
              from = pos + 1 + mappedPos;
              // ProsMirror uses 1 space for hardBreaks and 1 for text chars, maps 1:1
              to = from + trimmedOld.length;
            }
          }
        }
      });
      
      if (from !== -1 && to !== -1) {
        // We know we are doing an external injection, but it's seamless
        isExternalUpdate.current = true;
        editor.view.dispatch(editor.state.tr.insertText(trimmedNew, from, to));
      } else {
        // Fallback: if we couldn't find the exact subset, we fallback to updating everything
        isExternalUpdate.current = true;
        const { from: selFrom, to: selTo } = editor.state.selection;
        editor.commands.setContent(editor.getText().replace(oldText, newText));
        try {
           editor.commands.setTextSelection({ from: selFrom, to: selTo });
        } catch(e) {}
      }
    };

    window.addEventListener('tyk:replaceText', handleReplaceText);
    return () => window.removeEventListener('tyk:replaceText', handleReplaceText);
  }, [editor]);

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
    <div className={`tiptap-wrapper relative w-full h-full flex flex-col overflow-hidden min-h-0 ${className}`}>
      <EditorContent editor={editor} className="w-full flex-1 flex flex-col overflow-hidden min-h-0 outline-none prose prose-sm max-w-none" />
      
      {popup && (
        <div 
          className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-3 flex flex-col gap-2 w-72 animate-in fade-in zoom-in-95 duration-200"
          style={{ top: popup.coords.top, left: popup.coords.left }}
        >
          <div className="text-gray-600 font-medium text-[13px] leading-relaxed">
            {popup.issue.explication}
          </div>
          <div className="flex justify-between items-center mt-1 gap-2">
            <button
              className="flex-1 bg-[var(--tyk-sapphire)] text-white px-3 py-1.5 rounded-md font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!editor) return;
                const tr = editor.state.tr.insertText(popup.issue.correction, popup.from, popup.to);
                editor.view.dispatch(tr);
                if (applyCorrection) applyCorrection(popup.issue, 'editor');
                setPopup(null);
              }}
            >
              {popup.issue.correction}
            </button>
            <button
              className="flex-1 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md font-medium hover:bg-gray-200 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (ignoreCorrection) ignoreCorrection(popup.issue);
                setPopup(null);
              }}
            >
              Ignorer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
