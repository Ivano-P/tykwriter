'use client';

import { useState, useRef, useEffect } from 'react';
import * as Diff from 'diff';
import { ContentArea } from '@/components/ui/ContentArea';
import { CorrecteurSidebar } from '@/components/ui/CorrecteurSidebar';
import { MaitreRedacteurSidebar } from '@/components/ui/MaitreRedacteurSidebar';
import { TraductionSidebar } from '@/components/ui/TraductionSidebar';
import { spellcheckAction } from '@/actions/spellcheck.action';

type Mode = "correcteur" | "maitre-redacteur" | "traduction";

export function Workspace({ initialMode = "correcteur" }: { initialMode?: Mode }) {
  const [currentMode, setCurrentMode] = useState<Mode>(initialMode);

  useEffect(() => {
    setCurrentMode(initialMode);
  }, [initialMode]);
  const [globalText, setGlobalText] = useState<string>("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [isBoosterEnabled, setIsBoosterEnabled] = useState(false);

  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [diffParts, setDiffParts] = useState<Diff.Change[] | null>(null);

  const MAX_CHARS = 2000;

  const skipDebounceRef = useRef(false);
  const lastProcessedText = useRef<string>('');
  const lastProcessedBoosterState = useRef<boolean>(false);

  useEffect(() => {
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return;
    }

    if (globalText.trim() === '' || isProcessing || globalText.length > MAX_CHARS || currentMode === 'traduction') {
      return;
    }

    const timer = setTimeout(() => {
      // Pour l'instant on garde la logique métier identique pour correcteur et maitre-redacteur
      handleSpellCheck(globalText);
    }, 2500);

    return () => clearTimeout(timer);
  }, [globalText, isBoosterEnabled, currentMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSpellCheck = async (textToCheck: string) => {
    if (!textToCheck.trim() || isProcessing || currentMode === 'traduction') return;

    if (textToCheck === lastProcessedText.current) {
      const isUpgrading: boolean = !lastProcessedBoosterState.current && isBoosterEnabled;
      if (!isUpgrading) {
        return;
      }
    }

    setIsProcessing(true);
    try {
      const result = await spellcheckAction(textToCheck, isBoosterEnabled);

      if (result !== textToCheck) {
        const calculatedDiff = Diff.diffWords(textToCheck, result);
        setDiffParts(calculatedDiff);

        setUndoStack((prev: string[]) => [...prev, textToCheck]);
        setRedoStack([]);

        skipDebounceRef.current = true;
        setGlobalText(result);

        lastProcessedText.current = result;
      } else {
        setDiffParts(null);
        lastProcessedText.current = textToCheck;
      }

      lastProcessedBoosterState.current = isBoosterEnabled;
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChange = (val: string) => {
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

  const handleManualSubmit = () => {
    if (currentMode === 'traduction') return;
    skipDebounceRef.current = true;
    handleSpellCheck(globalText);
  };

  return (
    <>
      <div className="flex flex-col w-full">
        {/* Un petit menu de test pour vérifier la fonctionnalité de changement de mode si besoin */}
        <div className="md:hidden flex gap-2 mb-4 justify-center">
          <button onClick={() => setCurrentMode('correcteur')} className={`px-3 py-1 text-sm rounded ${currentMode === 'correcteur' ? 'bg-[#0F52BA] text-white' : 'bg-gray-200 text-gray-700'}`}>Correcteur</button>
          <button onClick={() => setCurrentMode('maitre-redacteur')} className={`px-3 py-1 text-sm rounded ${currentMode === 'maitre-redacteur' ? 'bg-[#0F52BA] text-white' : 'bg-gray-200 text-gray-700'}`}>Maitre Rédacteur</button>
          <button onClick={() => setCurrentMode('traduction')} className={`px-3 py-1 text-sm rounded ${currentMode === 'traduction' ? 'bg-[#0F52BA] text-white' : 'bg-gray-200 text-gray-700'}`}>Traduction</button>
        </div>

        <ContentArea
          currentMode={currentMode}
          text={globalText}
          onChange={handleChange}
          isProcessing={isProcessing}
          undoStackLength={undoStack.length}
          redoStackLength={redoStack.length}
          handleUndo={handleUndo}
          handleRedo={handleRedo}
          MAX_CHARS={MAX_CHARS}
        />
      </div>

      {currentMode === 'correcteur' && (
        <CorrecteurSidebar
          isProcessing={isProcessing}
          diffParts={diffParts}
          handleUndo={handleUndo}
          handleManualSubmit={handleManualSubmit}
          isSubmitDisabled={isProcessing || !globalText.trim() || globalText.length > MAX_CHARS}
          isBoosterEnabled={isBoosterEnabled}
          setIsBoosterEnabled={setIsBoosterEnabled}
        />
      )}

      {currentMode === 'maitre-redacteur' && (
        <MaitreRedacteurSidebar
          isProcessing={isProcessing}
          diffParts={diffParts}
          handleUndo={handleUndo}
          handleManualSubmit={handleManualSubmit}
          isSubmitDisabled={isProcessing || !globalText.trim() || globalText.length > MAX_CHARS}
          isBoosterEnabled={isBoosterEnabled}
          setIsBoosterEnabled={setIsBoosterEnabled}
        />
      )}

      {currentMode === 'traduction' && (
        <TraductionSidebar />
      )}
    </>
  );
}
