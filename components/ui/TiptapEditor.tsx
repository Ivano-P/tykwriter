'use client';

import { useEditor, EditorContent, Extension } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useEffect, useRef, useState } from 'react';
import * as Diff from 'diff';
import { CorrectionIssue } from '@/services/MistralAiProService';
import styles from './TiptapEditor.module.css';

// ─── Region diff helper ─────────────────────────────────────────────
// Computes the changed regions between oldText and newText using a
// word-level diff (diffWordsWithSpace: parts concatenate exactly).
// Each region covers [start, end) in oldText and carries the replacement
// text (empty string = pure deletion). Untouched regions are never
// rewritten, so their ProseMirror marks (links, …) survive corrections.
export interface ReplaceRegion {
  start: number;
  end: number;
  text: string;
}

export function computeReplaceRegions(oldText: string, newText: string): ReplaceRegion[] {
  const parts = Diff.diffWordsWithSpace(oldText, newText);
  const regions: ReplaceRegion[] = [];
  let oldPos = 0;
  let i = 0;

  while (i < parts.length) {
    const part = parts[i];
    if (!part.added && !part.removed) {
      oldPos += part.value.length;
      i++;
      continue;
    }
    // Group consecutive removed/added parts into a single region
    let removedLen = 0;
    let addedText = '';
    while (i < parts.length && (parts[i].added || parts[i].removed)) {
      if (parts[i].removed) removedLen += parts[i].value.length;
      else addedText += parts[i].value;
      i++;
    }
    regions.push({ start: oldPos, end: oldPos + removedLen, text: addedText });
    oldPos += removedLen;
  }

  return regions;
}

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
  isLinkEnabled?: boolean;
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
  isLinkEnabled = false,
}: TiptapEditorProps) {
  const issuesRef = useRef(correctionIssues);
  const applyCorrectionRef = useRef(applyCorrection);
  const ignoreCorrectionRef = useRef(ignoreCorrection);
  const isExternalUpdate = useRef(false);
  const latestGlobalTextRef = useRef(globalText);
  const isLinkEnabledRef = useRef(isLinkEnabled);
  const [popup, setPopup] = useState<PopupState | null>(null);

  // BubbleMenu state for editing an existing link
  const [editLinkHref, setEditLinkHref] = useState('');

  // BubbleMenu state for creating a new link
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const prevLinkEnabledRef = useRef(isLinkEnabled);

  useEffect(() => {
    isLinkEnabledRef.current = isLinkEnabled;
  }, [isLinkEnabled]);

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

              // Build the full document text EXACTLY like editor.getText()
              // (block separator "\n\n", hardBreak → "\n"), keeping a map of
              // text segments back to ProseMirror positions. This lets us
              // count occurrences globally, matching the indexes computed by
              // SpellcheckService on globalText.
              let fullText = '';
              const segments: { textStart: number; textEnd: number; pos: number }[] = [];

              doc.nodesBetween(0, doc.content.size, (node, pos) => {
                if (node.isBlock && pos > 0) {
                  fullText += '\n\n';
                }
                if (node.type.name === 'hardBreak') {
                  segments.push({ textStart: fullText.length, textEnd: fullText.length + 1, pos });
                  fullText += '\n';
                  return false;
                }
                if (node.isText && node.text) {
                  segments.push({ textStart: fullText.length, textEnd: fullText.length + node.text.length, pos });
                  fullText += node.text;
                }
                return true;
              });

              // Map a text index back to a doc position. Start indexes must fall
              // strictly inside a segment; end indexes may sit on its right edge.
              const mapStart = (index: number): number | null => {
                const seg = segments.find(s => index >= s.textStart && index < s.textEnd);
                return seg ? seg.pos + (index - seg.textStart) : null;
              };
              const mapEnd = (index: number): number | null => {
                const seg = segments.find(s => index > s.textStart && index <= s.textEnd);
                return seg ? seg.pos + (index - seg.textStart) : null;
              };

              const decorations: Decoration[] = [];

              issues.forEach((issue) => {
                const textToFind = issue.texte_original;
                if (!textToFind) return;

                // Collect every (non-overlapping) occurrence in the full text
                const matchIndexes: number[] = [];
                let matchIndex = fullText.indexOf(textToFind);
                while (matchIndex > -1) {
                  matchIndexes.push(matchIndex);
                  matchIndex = fullText.indexOf(textToFind, matchIndex + textToFind.length);
                }
                if (matchIndexes.length === 0) return;

                // Decorate ONLY the issue's nth occurrence; fall back to the
                // first match when occurrence is undefined or out of range.
                const nth = issue.occurrence;
                const target = nth !== undefined && nth >= 0 && nth < matchIndexes.length
                  ? matchIndexes[nth]
                  : matchIndexes[0];

                const from = mapStart(target);
                const to = mapEnd(target + textToFind.length);
                if (from === null || to === null) return;

                decorations.push(
                  Decoration.inline(from, to, {
                    class: 'border-b-2 border-[var(--destructive)] bg-[var(--destructive)]/10 text-[var(--destructive)] cursor-pointer',
                    'data-correction-id': issue.id
                  }, {
                    'data-correction-id': issue.id
                  })
                );
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

  // ── Editor instance ───────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      // StarterKit ships its own `link` extension since TipTap 3 — disable it
      // so our configured Link below is the only one (avoids duplicate names).
      StarterKit.configure({ link: false }),
      CorrectionHighlighter,
      Link.configure({
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

  // ── Strip links when toggle is turned OFF ─────────────────────────
  useEffect(() => {
    if (!editor) return;

    // When toggled OFF → strip all link marks back to plain text
    if (prevLinkEnabledRef.current && !isLinkEnabled) {
      const { tr } = editor.state;
      const linkType = editor.schema.marks.link;
      let modified = false;

      if (linkType) {
        editor.state.doc.descendants((node, pos) => {
          if (!node.isText) return;
          if (node.marks.some((m) => m.type === linkType)) {
            tr.removeMark(pos, pos + node.nodeSize, linkType);
            modified = true;
          }
        });
      }

      if (modified) {
        isExternalUpdate.current = true;
        editor.view.dispatch(tr);
      }
    }

    prevLinkEnabledRef.current = isLinkEnabled;
  }, [isLinkEnabled, editor]);

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
  // Mark-preserving replacement: instead of rewriting the whole matched
  // range (or worse, the whole document), only the regions that actually
  // changed are touched, so link marks on unchanged words survive.
  useEffect(() => {
    if (!editor) return;

    const handleReplaceText = (e: Event) => {
      const customEvent = e as CustomEvent<{ oldText: string, newText: string }>;
      const { oldText, newText } = customEvent.detail;

      const trimmedOld = oldText.trim();
      const trimmedNew = newText.trim();
      if (!trimmedOld) return;

      // Resolve every changed region against the CURRENT doc, then apply
      // them right-to-left in ONE transaction so earlier positions stay
      // valid. Returns false when a region cannot be mapped.
      const applyRegions = (mapIndexToPos: (index: number, isEnd: boolean) => number | null): boolean => {
        const regions = computeReplaceRegions(trimmedOld, trimmedNew);
        if (regions.length === 0) return true; // nothing to change

        const mapped: { from: number; to: number; text: string }[] = [];
        for (const region of regions) {
          const from = region.start === region.end
            ? (mapIndexToPos(region.start, false) ?? mapIndexToPos(region.start, true))
            : mapIndexToPos(region.start, false);
          const to = region.start === region.end ? from : mapIndexToPos(region.end, true);
          if (from === null || to === null || from === undefined || to === undefined) return false;
          mapped.push({ from, to, text: region.text });
        }

        const { tr } = editor.state;
        for (let i = mapped.length - 1; i >= 0; i--) {
          const { from, to, text } = mapped[i];
          if (text) {
            tr.insertText(text, from, to);
          } else {
            tr.delete(from, to);
          }
        }
        // No isExternalUpdate flag here: onUpdate must run for this
        // transaction so setGlobalText keeps page state in sync.
        editor.view.dispatch(tr);
        return true;
      };

      // ── Primary path: find the old text inside a single block ──────
      let blockFrom = -1;

      editor.state.doc.descendants((node, pos) => {
        if (blockFrom !== -1) return false;

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
              blockFrom = pos + 1 + mappedPos;
            }
          }
        }
      });

      if (blockFrom !== -1) {
        // Inside a single block, text offsets and doc positions advance in
        // lockstep (1 text char = 1 position, hardBreak = 1 char = 1 pos).
        const base = blockFrom;
        if (applyRegions((index) => base + index)) return;
      }

      // ── Fallback: search across block boundaries using the same
      // getText-parity mapping as the CorrectionHighlighter plugin
      // ("\n\n" between blocks, hardBreak = "\n"). ──────────────────
      const { doc } = editor.state;
      let fullText = '';
      const segments: { textStart: number; textEnd: number; pos: number }[] = [];

      doc.nodesBetween(0, doc.content.size, (node, pos) => {
        if (node.isBlock && pos > 0) {
          fullText += '\n\n';
        }
        if (node.type.name === 'hardBreak') {
          segments.push({ textStart: fullText.length, textEnd: fullText.length + 1, pos });
          fullText += '\n';
          return false;
        }
        if (node.isText && node.text) {
          segments.push({ textStart: fullText.length, textEnd: fullText.length + node.text.length, pos });
          fullText += node.text;
        }
        return true;
      });

      const matchIndex = fullText.indexOf(trimmedOld);
      if (matchIndex === -1) {
        console.warn('[TiptapEditor] tyk:replaceText — old text not found in document, correction skipped.');
        return;
      }

      const mapIndexToPos = (index: number, isEnd: boolean): number | null => {
        const absolute = matchIndex + index;
        const seg = isEnd
          ? segments.find(s => absolute > s.textStart && absolute <= s.textEnd)
          : segments.find(s => absolute >= s.textStart && absolute < s.textEnd);
        return seg ? seg.pos + (absolute - seg.textStart) : null;
      };

      if (!applyRegions(mapIndexToPos)) {
        console.warn('[TiptapEditor] tyk:replaceText — could not map correction to document positions, correction skipped.');
      }
    };

    window.addEventListener('tyk:replaceText', handleReplaceText);
    return () => window.removeEventListener('tyk:replaceText', handleReplaceText);
  }, [editor]);

  // ── Listen for tyk:copyAll events (toolbar "Copier" button) ────────
  // Standard clipboard behavior: rich text (text/html) keeps the links,
  // plain text is just the document text.
  useEffect(() => {
    if (!editor) return;

    const handleCopyAll = () => {
      const fullText = editor.getText();
      const html = editor.getHTML();

      try {
        const item = new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([fullText], { type: 'text/plain' }),
        });
        navigator.clipboard.write([item]).catch(() => {
          navigator.clipboard.writeText(fullText).catch(console.error);
        });
      } catch {
        navigator.clipboard.writeText(fullText).catch(console.error);
      }
    };

    window.addEventListener('tyk:copyAll', handleCopyAll);
    return () => window.removeEventListener('tyk:copyAll', handleCopyAll);
  }, [editor]);

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
      .setLink({ href: editLinkHref })
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
      .setLink({ href: newLinkUrl.trim() })
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

      {/* ── BubbleMenu: Create a new link (only when isLinkEnabled + text selected + no existing link) ── */}
      <BubbleMenu
        editor={editor}
        options={{ placement: 'bottom-start' }}
        shouldShow={({ editor: e }) => {
          if (!isLinkEnabledRef.current) return false;
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
            placeholder="URL du lien..."
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
