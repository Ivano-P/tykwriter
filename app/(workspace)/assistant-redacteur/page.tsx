'use client';

import { useState, useRef, useEffect } from 'react';
import * as Diff from 'diff';
import { ContentArea } from '@/components/ui/ContentArea';
import { AssistantRedacteurSidebar } from '@/components/ui/AssistantRedacteurSidebar';
import { spellcheckAction } from '@/actions/spellcheck.action';
import { AutoCorrect } from '@/services/AutoCorrect';
import { ChunkManager } from '@/services/ChunkManager';
import { formatEmailText } from '@/lib/utils';
import { useText } from '@/lib/TextContext';
import layoutStyles from '../layout.module.css';

const ASSISTANT_REDACTEUR_DELAY = 5000;
const MAX_CHARS = 2000;

export default function AssistantRedacteurPage() {
  const { globalText, setGlobalText } = useText();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoCorrectEnabled, setIsAutoCorrectEnabled] = useState(true);
  const [isSnLinkEnabled, setIsSnLinkEnabled] = useState(false);

  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [diffParts, setDiffParts] = useState<Diff.Change[] | null>(null);

  const skipDebounceRef = useRef(false);
  const pendingRequestsRef = useRef<Map<string, AbortController>>(new Map());
  const processedCacheRef = useRef<Map<string, { correctedText: string; isPartial: boolean; hasChanges: boolean }>>(new Map());
  const processingBlocksRef = useRef<Set<string>>(new Set());
  const latestGlobalTextRef = useRef(globalText);

  useEffect(() => {
    latestGlobalTextRef.current = globalText;
  }, [globalText]);

  // Non-blocking Hybrid Trigger for Assistant Rédacteur
  useEffect(() => {
    if (!isAutoCorrectEnabled || globalText.trim() === '') {
      if (globalText.trim() === '') {
        pendingRequestsRef.current.forEach(c => c.abort());
        pendingRequestsRef.current.clear();
        processingBlocksRef.current.clear();
        processedCacheRef.current.clear();
      }
      return;
    }

    const chunks = ChunkManager.splitIntoBlocks(globalText);
    const currentChunkOriginals = new Set(chunks.map(c => c.originalText));

    // Abort out-of-date requests
    Array.from(pendingRequestsRef.current.entries()).forEach(([originalText, controller]) => {
      if (!currentChunkOriginals.has(originalText)) {
        controller.abort();
        pendingRequestsRef.current.delete(originalText);
        processingBlocksRef.current.delete(originalText);
      }
    });

    // Check which chunks need to be sent immediately (Complete chunks)
    chunks.forEach((chunk) => {
      const { originalText, isComplete } = chunk;
      if (!originalText.trim()) return;

      const cached = processedCacheRef.current.get(originalText);
      const isProcessingChunk = processingBlocksRef.current.has(originalText);

      if (cached && !(cached.isPartial && isComplete)) return;
      if (isProcessingChunk) return;

      if (isComplete) {
        triggerAssistantApi(originalText, true);
      }
    });

    // Handle the final partial chunk with debounce
    const lastChunk = chunks[chunks.length - 1];
    if (lastChunk && !lastChunk.isComplete && lastChunk.originalText.trim()) {
      const timeoutId = setTimeout(() => {
        if (!processedCacheRef.current.has(lastChunk.originalText) && !processingBlocksRef.current.has(lastChunk.originalText)) {
          triggerAssistantApi(lastChunk.originalText, false);
        }
      }, ASSISTANT_REDACTEUR_DELAY);
      return () => clearTimeout(timeoutId);
    }
  }, [globalText, isAutoCorrectEnabled]);

  const triggerAssistantApi = async (originalText: string, isComplete: boolean) => {
    const controller = new AbortController();
    pendingRequestsRef.current.set(originalText, controller);
    processingBlocksRef.current.add(originalText);

    try {
      const resp = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: originalText }),
        signal: controller.signal
      });

      if (!resp.ok) {
        throw new Error('API Request failed');
      }

      const data = await resp.json();
      const correctedText = data.correctedText;
      const processed = AutoCorrect.processCorrections(originalText, correctedText);

      processedCacheRef.current.set(originalText, {
        correctedText,
        isPartial: !isComplete,
        hasChanges: processed.hasChanges
      });

      if (processed.hasChanges) {
        window.dispatchEvent(new CustomEvent('tyk:replaceText', {
          detail: { oldText: originalText, newText: correctedText }
        }));

        setUndoStack((prev) => [...prev, latestGlobalTextRef.current]);
        setRedoStack([]);
        setDiffParts(processed.diffParts);
        skipDebounceRef.current = true;
      }

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('API Error:', err);
      }
    } finally {
      pendingRequestsRef.current.delete(originalText);
      processingBlocksRef.current.delete(originalText);
    }
  };

  // Legacy manual check fallback
  const handleSpellCheck = async (textToCheck: string) => {
    if (!textToCheck.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      const result = await spellcheckAction(textToCheck);
      const processed = AutoCorrect.processCorrections(textToCheck, result);

      if (processed.hasChanges) {
        setDiffParts(processed.diffParts);
        setUndoStack((prev: string[]) => [...prev, textToCheck]);
        setRedoStack([]);

        skipDebounceRef.current = true;
        setGlobalText(processed.newText);
      } else {
        setDiffParts([]);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = () => {
    skipDebounceRef.current = true;
    handleSpellCheck(globalText);
  };

  const handleChange = (val: string) => {
    const SKIP_SPELLCHECK_ON_DELETE = true;

    if (SKIP_SPELLCHECK_ON_DELETE && val.length < globalText.length) {
      skipDebounceRef.current = true;
    }

    if (val.length <= MAX_CHARS) {
      setGlobalText(val);
      setDiffParts(null);
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || isProcessing) return;
    const lastText = undoStack[undoStack.length - 1];

    setRedoStack((prev: string[]) => [...prev, globalText]);
    setUndoStack((prev: string[]) => prev.slice(0, -1));

    skipDebounceRef.current = true;
    setGlobalText(lastText);
    setDiffParts(null);
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || isProcessing) return;
    const nextText = redoStack[redoStack.length - 1];

    setUndoStack((prev: string[]) => [...prev, globalText]);
    setRedoStack((prev: string[]) => prev.slice(0, -1));

    skipDebounceRef.current = true;
    setGlobalText(nextText);
    setDiffParts(null);
  };

  const handleFormatEmail = () => {
    skipDebounceRef.current = true;
    const formattedText = formatEmailText(globalText);

    if (formattedText !== globalText) {
      setUndoStack((prev) => [...prev, globalText]);
      setRedoStack([]);
      setGlobalText(formattedText);
    }
  };

  const currentlyProcessing = processingBlocksRef.current.size > 0;

  return (
    <>
      <div className={layoutStyles.headerBanner}>
        <h1 className={layoutStyles.headerTitle}>
          Votre Assistant de Rédaction et Correcteur de Précision.
        </h1>
        <p className={layoutStyles.headerSubtitle}>
          Saisissez librement, et votre Assistant Rédacteur Tykwriter s&apos;occupe des détails (orthographe, mise en forme et fluidité).
        </p>
      </div>

      <div className={layoutStyles.workspaceContent}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <ContentArea
            currentMode="assistant-redacteur"
            text={globalText}
            onChange={handleChange}
            isProcessing={false}
            undoStackLength={undoStack.length}
            redoStackLength={redoStack.length}
            handleUndo={handleUndo}
            handleRedo={handleRedo}
            MAX_CHARS={MAX_CHARS}
            isSnLinkEnabled={isSnLinkEnabled}
          />
        </div>

        <AssistantRedacteurSidebar
          isProcessing={currentlyProcessing}
          diffParts={diffParts}
          handleUndo={handleUndo}
          handleManualSubmit={handleManualSubmit}
          isSubmitDisabled={currentlyProcessing || !globalText.trim() || globalText.length > MAX_CHARS}
          isAutoCorrectEnabled={isAutoCorrectEnabled}
          setIsAutoCorrectEnabled={setIsAutoCorrectEnabled}
          handleFormatEmail={handleFormatEmail}
          isSnLinkEnabled={isSnLinkEnabled}
          setIsSnLinkEnabled={setIsSnLinkEnabled}
        />
      </div>
    </>
  );
}
