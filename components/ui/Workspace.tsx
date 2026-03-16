'use client';

import { useState, useRef, useEffect } from 'react';
import * as Diff from 'diff';
import { ContentArea } from '@/components/ui/ContentArea';
import { CorrectionSidebar } from '@/components/ui/CorrectionSidebar';
import { spellcheckAction } from '@/actions/spellcheck.action';

export function Workspace() {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoCorrectEnabled, setIsAutoCorrectEnabled] = useState(false);

  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [diffParts, setDiffParts] = useState<Diff.Change[] | null>(null);

  const MAX_CHARS = 2000;

  const skipDebounceRef = useRef(false);
  const lastProcessedText = useRef<string>('');
  const autoCorrectDelay = 3500;//change this value to change the auto-correct delay

  useEffect(() => {
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return;
    }

    if (text.trim() === '' || isProcessing || text.length > MAX_CHARS) {
      return;
    }

    if (!isAutoCorrectEnabled) return;

    const timer = setTimeout(() => {
      handleSpellCheck(text);
    }, autoCorrectDelay);

    return () => clearTimeout(timer);
  }, [text, isAutoCorrectEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSpellCheck = async (textToCheck: string) => {
    if (!textToCheck.trim() || isProcessing) return;

    if (textToCheck === lastProcessedText.current) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await spellcheckAction(textToCheck);

      if (result !== textToCheck) {
        const calculatedDiff = Diff.diffWords(textToCheck, result);
        setDiffParts(calculatedDiff);

        setUndoStack((prev: string[]) => [...prev, textToCheck]);
        setRedoStack([]);

        skipDebounceRef.current = true;
        setText(result);

        lastProcessedText.current = result;
      } else {
        setDiffParts(null);
        lastProcessedText.current = textToCheck;
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChange = (val: string) => {
    if (val.length <= MAX_CHARS) {
      setText(val);
      setDiffParts(null);
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || isProcessing) return;
    const lastText = undoStack[undoStack.length - 1];

    setRedoStack((prev: string[]) => [...prev, text]);
    setUndoStack((prev: string[]) => prev.slice(0, -1));

    skipDebounceRef.current = true;
    setText(lastText);
    setDiffParts(null);
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || isProcessing) return;
    const nextText = redoStack[redoStack.length - 1];

    setUndoStack((prev: string[]) => [...prev, text]);
    setRedoStack((prev: string[]) => prev.slice(0, -1));

    skipDebounceRef.current = true;
    setText(nextText);
    setDiffParts(null);
  };

  const handleManualSubmit = () => {
    skipDebounceRef.current = true;
    handleSpellCheck(text);
  };

  return (
    <>
      <ContentArea
        text={text}
        onChange={handleChange}
        isProcessing={isProcessing}
        undoStackLength={undoStack.length}
        redoStackLength={redoStack.length}
        handleUndo={handleUndo}
        handleRedo={handleRedo}
        MAX_CHARS={MAX_CHARS}
      />
      <CorrectionSidebar
        isProcessing={isProcessing}
        diffParts={diffParts}
        handleUndo={handleUndo}
        handleManualSubmit={handleManualSubmit}
        isSubmitDisabled={isProcessing || !text.trim() || text.length > MAX_CHARS}
        isAutoCorrectEnabled={isAutoCorrectEnabled}
        setIsAutoCorrectEnabled={setIsAutoCorrectEnabled}
      />
    </>
  );
}
