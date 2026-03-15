'use client';

import { useEditor, EditorContent, Extension } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { DOMSerializer } from '@tiptap/pm/model';
import { useEffect, useRef, useState, useCallback } from 'react';
import { CorrectionIssue } from '@/services/MistralAiProService';
import styles from './TiptapEditor.module.css';

// ─── SnLink: custom Link extension that preserves data-sn ───────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SnLink = (Link as any).extend({
  addAttributes() {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(this as any).parent?.(),
      'data-sn': {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-sn'),
        renderHTML: (attrs: Record<string, unknown>) => {
          if (!attrs['data-sn']) return {};
          return { 'data-sn': attrs['data-sn'] as string };
        },
      },
    };
  },
});

// ─── Types ──────────────────────────────────────────────────────────
interface TiptapEditorProps {
  globalText: string;
  setGlobalText: (text: string) => void;
  isProcessing?: boolean;
  maxLength?: number;
  className?: string;
  correctionIssues?: CorrectionIssue[];
  applyCorrection?: (issue: CorrectionIssue, source: 'sidebar' | 'editor') => void;
  ignoreCorrection?: (issue: CorrectionIssue) => void;
  isSnLinkEnabled?: boolean;
}

interface PopupState {
  issue: CorrectionIssue;
  coords: { top: number; left: number };
  from: number;
  to: number;
}

// ─── Component ──────────────────────────────────────────────────────
export function TiptapEditor({
  globalText,
  setGlobalText,
  isProcessing = false,
  maxLength = 2000,
  className = '',
  correctionIssues = [],
  applyCorrection,
  ignoreCorrection,
  isSnLinkEnabled = false,
}: TiptapEditorProps) {
  const issuesRef = useRef(correctionIssues);
  const applyCorrectionRef = useRef(applyCorrection);
  const ignoreCorrectionRef = useRef(ignoreCorrection);
  const isExternalUpdate = useRef(false);
  const latestGlobalTextRef = useRef(globalText);
  const isSnLinkEnabledRef = useRef(isSnLinkEnabled);
  const [popup, setPopup] = useState<PopupState | null>(null);

  // BubbleMenu state for editing an existing link
  const [editLinkHref, setEditLinkHref] = useState('');

  // BubbleMenu state for creating a new link
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const prevSnLinkRef = useRef(isSnLinkEnabled);

  useEffect(() => {
    isSnLinkEnabledRef.current = isSnLinkEnabled;
  }, [isSnLinkEnabled]);

  useEffect(() => {
    issuesRef.current = correctionIssues;
    applyCorrectionRef.current = applyCorrection;
    ignoreCorrectionRef.current = ignoreCorrection;
    latestGlobalTextRef.current = globalText;
    if (editor) {
      editor.view.dispatch(editor.state.tr.setMeta('updateCorrections', true));
      setPopup(null);
    }
  }, [correctionIssues, applyCorrection, ignoreCorrection, globalText]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── CorrectionHighlighter plugin (unchanged logic) ────────────────
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
            apply(tr) {
              const issues = issuesRef.current;
              const { doc } = tr;
              if (!issues || issues.length === 0) {
                return DecorationSet.empty;
              }

              const decorations: Decoration[] = [];

              doc.descendants((node, pos) => {
                if (node.isText && node.text) {
                  issues.forEach((issue) => {
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
            handleClick(view, _pos, event) {
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

  // ── Helper: transform HTML with SN links into [code]...[/code] text ─
  const processSnLinksFromHtml = useCallback(
    (html: string, plainText: string): { processed: boolean; text: string } => {
      // Guard: if the raw text already contains [code]<a href=, skip transformation
      if (plainText.includes('[code]<a href=')) {
        return { processed: false, text: plainText };
      }

      const tempDoc = document.implementation.createHTMLDocument();
      tempDoc.body.innerHTML = html;

      const snAnchors = tempDoc.body.querySelectorAll('a[data-sn="true"]');
      if (snAnchors.length === 0) {
        return { processed: false, text: plainText };
      }

      // Clone to manipulate
      const workingDiv = document.createElement('div');
      workingDiv.innerHTML = html;

      workingDiv.querySelectorAll('a[data-sn="true"]').forEach((anchor) => {
        const href = anchor.getAttribute('href') || '';
        const text = anchor.textContent || '';
        const replacement = document.createTextNode(`[code]<a href="${href}">${text}</a>[/code]`);
        anchor.parentNode?.replaceChild(replacement, anchor);
      });

      return { processed: true, text: workingDiv.textContent || '' };
    },
    []
  );

  // ── Copy interceptor (Ctrl+C) ─────────────────────────────────────
  const handleCopyEvent = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (view: any, event: Event): boolean => {
      const clipEvent = event as ClipboardEvent;
      const { state } = view;
      const { from, to } = state.selection;
      if (from === to) return false; // nothing selected

      // Serialize the selected fragment to HTML
      const slice = state.doc.slice(from, to);
      const serializer = DOMSerializer.fromSchema(state.schema);
      const serDoc = document.implementation.createHTMLDocument();
      const fragment = serializer.serializeFragment(slice.content, { document: serDoc });
      serDoc.body.appendChild(fragment);
      const html = serDoc.body.innerHTML;

      const plainText: string = state.doc.textBetween(from, to, '\n');
      const result = processSnLinksFromHtml(html, plainText);

      if (!result.processed) return false;

      if (clipEvent.clipboardData) {
        clipEvent.clipboardData.setData('text/plain', result.text);
        clipEvent.clipboardData.setData('text/html', html);
        clipEvent.preventDefault();
      }

      return true;
    },
    [processSnLinksFromHtml]
  );

  // ── Editor instance ───────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit,
      CorrectionHighlighter,
      SnLink.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[var(--tyk-sapphire)] underline cursor-pointer',
        },
      }),
    ],
    content: globalText,
    editable: !isProcessing,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `focus:outline-none overflow-y-auto flex-1 h-full w-full ${className}`,
      },
      handleDOMEvents: {
        copy: handleCopyEvent,
      },
    },
    onUpdate: ({ editor: ed, transaction }) => {
      if (!transaction.docChanged) return;
      
      if (isExternalUpdate.current) {
        isExternalUpdate.current = false;
        return;
      }
      
      setPopup(null);
      
      let text = ed.getText();
      if (maxLength && text.length > maxLength) {
        text = text.substring(0, maxLength);
      }
      
      if (text === latestGlobalTextRef.current) {
        return;
      }
      
      setGlobalText(text);
    },
  });

  // ── Strip SN links when toggle is turned OFF ──────────────────────
  useEffect(() => {
    if (!editor) return;

    // When toggled OFF → strip all SN links back to plain text
    if (prevSnLinkRef.current && !isSnLinkEnabled) {
      const { tr } = editor.state;
      const linkType = editor.schema.marks.link;
      let modified = false;

      editor.state.doc.descendants((node, pos) => {
        if (!node.isText) return;
        const linkMark = linkType ? node.marks.find(
          (m) => m.type === linkType && m.attrs['data-sn'] === 'true'
        ) : null;
        if (linkMark) {
          tr.removeMark(pos, pos + node.nodeSize, linkType);
          modified = true;
        }
      });

      if (modified) {
        isExternalUpdate.current = true;
        editor.view.dispatch(tr);
      }
    }

    prevSnLinkRef.current = isSnLinkEnabled;
  }, [isSnLinkEnabled, editor]);

  // ── Sync external changes into editor ─────────────────────────────
  useEffect(() => {
    if (editor && globalText !== editor.getText() && !isExternalUpdate.current) {
      isExternalUpdate.current = true;
      
      const escapeHtml = (unsafe: string) => unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

      const htmlContent = globalText
        .split('\n\n')
        .map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
        .join('');

      editor.commands.setContent(htmlContent);
    }
  }, [globalText, editor]);

  // ── Listen for tyk:replaceText events ─────────────────────────────
  useEffect(() => {
    if (!editor) return;

    const handleReplaceText = (e: Event) => {
      const customEvent = e as CustomEvent<{ oldText: string, newText: string }>;
      const { oldText, newText } = customEvent.detail;
      
      const trimmedOld = oldText.trim();
      const trimmedNew = newText.trim();
      if (!trimmedOld) return;
      
      let from = -1;
      let to = -1;
      
      editor.state.doc.descendants((node, pos) => {
        if (from !== -1) return false;
        
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
              to = from + trimmedOld.length;
            }
          }
        }
      });
      
      if (from !== -1 && to !== -1) {
        isExternalUpdate.current = true;
        editor.view.dispatch(editor.state.tr.insertText(trimmedNew, from, to));
      } else {
        isExternalUpdate.current = true;
        const { from: selFrom, to: selTo } = editor.state.selection;
        const newTextFull = editor.getText().replace(oldText, newText);
        
        const escapeHtml = (unsafe: string) => unsafe
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
          
        const htmlContent = newTextFull
          .split('\n\n')
          .map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
          .join('');
          
        editor.commands.setContent(htmlContent);
        try {
           editor.commands.setTextSelection({ from: selFrom, to: selTo });
        } catch { /* ignore selection errors */ }
      }
    };

    window.addEventListener('tyk:replaceText', handleReplaceText);
    return () => window.removeEventListener('tyk:replaceText', handleReplaceText);
  }, [editor]);

  // ── Listen for tyk:copyAll events (toolbar "Copier" button) ────────
  useEffect(() => {
    if (!editor) return;

    const handleCopyAll = () => {
      const { state } = editor;
      const fullText = editor.getText();

      // Serialize the entire document to HTML
      const serializer = DOMSerializer.fromSchema(state.schema);
      const serDoc = document.implementation.createHTMLDocument();
      const fragment = serializer.serializeFragment(state.doc.content, { document: serDoc });
      serDoc.body.appendChild(fragment);
      const html = serDoc.body.innerHTML;

      const result = processSnLinksFromHtml(html, fullText);

      if (result.processed) {
        navigator.clipboard.writeText(result.text).catch(console.error);
      } else {
        navigator.clipboard.writeText(fullText).catch(console.error);
      }
    };

    window.addEventListener('tyk:copyAll', handleCopyAll);
    return () => window.removeEventListener('tyk:copyAll', handleCopyAll);
  }, [editor, processSnLinksFromHtml]);

  // ── Sync disabled state ───────────────────────────────────────────
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isProcessing);
    }
  }, [isProcessing, editor]);

  // ── Sync BubbleMenu href when the user clicks on a link ───────────
  useEffect(() => {
    if (!editor) return;

    const onSelectionUpdate = () => {
      if (editor.isActive('link')) {
        const attrs = editor.getAttributes('link');
        setEditLinkHref(attrs.href || '');
      }
    };

    editor.on('selectionUpdate', onSelectionUpdate);
    return () => { editor.off('selectionUpdate', onSelectionUpdate); };
  }, [editor]);

  // ── Handlers for edit BubbleMenu ──────────────────────────────────
  const handleUpdateLink = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .setLink({ href: editLinkHref, 'data-sn': isSnLinkEnabledRef.current ? 'true' : null } as any)
      .run();
  };

  const handleRemoveLink = () => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
  };

  // ── Handler for creation BubbleMenu ───────────────────────────────
  const handleApplyNewLink = () => {
    if (!editor || !newLinkUrl.trim()) return;
    editor
      .chain()
      .focus()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .setLink({ href: newLinkUrl.trim(), 'data-sn': 'true' } as any)
      .run();
    setNewLinkUrl('');
  };

  if (!editor) {
    return null;
  }

  return (
    <div className={`tiptap-wrapper relative w-full h-full flex flex-col overflow-hidden min-h-0 ${className}`}>
      <EditorContent editor={editor} className="w-full flex-1 flex flex-col overflow-hidden min-h-0 outline-none prose prose-sm max-w-none" />
      
      {/* ── BubbleMenu: Edit an existing link ── */}
      <BubbleMenu
        editor={editor}
        options={{ placement: 'bottom-start' }}
        shouldShow={({ editor: e }) => e.isActive('link')}
      >
        <div className={styles.bubbleMenu}>
          <input
            type="text"
            className={styles.linkInput}
            value={editLinkHref}
            onChange={(e) => setEditLinkHref(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUpdateLink(); } }}
            placeholder="https://..."
          />
          <div className={styles.bubbleSeparator} />
          <button className={`${styles.bubbleBtn} ${styles.bubbleBtnUpdate}`} onClick={handleUpdateLink}>
            ✓
          </button>
          <button className={`${styles.bubbleBtn} ${styles.bubbleBtnDelete}`} onClick={handleRemoveLink}>
            ✗
          </button>
        </div>
      </BubbleMenu>

      {/* ── BubbleMenu: Create a new SN link (only when isSnLinkEnabled + text selected + no existing link) ── */}
      <BubbleMenu
        editor={editor}
        options={{ placement: 'bottom-start' }}
        shouldShow={({ editor: e }) => {
          if (!isSnLinkEnabledRef.current) return false;
          if (e.isActive('link')) return false;
          if (e.state.selection.empty) return false;
          return true;
        }}
      >
        <div className={styles.bubbleMenu}>
          <input
            type="text"
            className={`${styles.linkInput} ${styles.linkInputWide}`}
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyNewLink(); } }}
            placeholder="URL du lien SN..."
          />
          <button
            className={`${styles.bubbleBtn} ${styles.bubbleBtnApply}`}
            onClick={handleApplyNewLink}
            disabled={!newLinkUrl.trim()}
          >
            Appliquer
          </button>
        </div>
      </BubbleMenu>

      {/* ── Correction popup ── */}
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
