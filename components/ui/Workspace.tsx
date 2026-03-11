'use client';

import { useState, useRef, useEffect } from 'react';
import * as Diff from 'diff';
import { ContentArea } from '@/components/ui/ContentArea';
import { CorrecteurSidebar } from '@/components/ui/CorrecteurSidebar';
import { AssistantRedacteurSidebar } from '@/components/ui/AssistantRedacteurSidebar';
import { TraductionSidebar } from '@/components/ui/TraductionSidebar';
import { spellcheckAction } from '@/actions/spellcheck.action';

type Mode = "correcteur" | "assistant-redacteur" | "traduction";

export function Workspace({ initialMode = "correcteur" }: { initialMode?: Mode }) {
  const [currentMode, setCurrentMode] = useState<Mode>(initialMode);

  useEffect(() => {
    setCurrentMode(initialMode);
  }, [initialMode]);
  const [globalText, setGlobalText] = useState<string>("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [isBoosterEnabled, setIsBoosterEnabled] = useState(true);
  const [isAutoCorrectEnabled, setIsAutoCorrectEnabled] = useState(true);

  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [diffParts, setDiffParts] = useState<Diff.Change[] | null>(null);

  const MAX_CHARS = 2000;

  const skipDebounceRef = useRef(false);
  const lastProcessedText = useRef<string>('');
  const lastProcessedBoosterState = useRef<boolean>(false);
  const autoCorrectDelay: number = 3000; //change the delay time here for auto correct

  useEffect(() => {
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return;
    }

    if (globalText.trim() === '' || isProcessing || globalText.length > MAX_CHARS || currentMode === 'traduction' || !isAutoCorrectEnabled) {
      return;
    }

    const timer = setTimeout(() => {
      // Pour l'instant on garde la logique métier identique pour correcteur et assistant-redacteur
      handleSpellCheck(globalText);
    }, autoCorrectDelay);

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
    <div className="flex flex-col w-full h-full overflow-hidden">
      <div className="text-center py-6 px-4 shrink-0">
        <h1 className="text-2xl font-bold text-[var(--tyk-sapphire)]">
          Votre Assistant de Rédaction et Correcteur de Précision.
        </h1>
        <p className="text-[var(--tyk-dust-brown)] mt-2 max-w-2xl mx-auto">
          {currentMode === 'correcteur'
            ? "Éliminez les fautes d'orthographe, de grammaire et de syntaxe, tout en préservant votre style et votre voix unique."
            : currentMode === 'assistant-redacteur'
              ? "Saisissez librement, et votre Assistant Rédacteur Tykwriter s'occupe des détails (orthographe, mise en forme et fluidité)."
              : "Traduisez vos textes avec une précision absolue et un ton naturel grâce à une compréhension profonde de votre contexte."}
        </p>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 flex flex-col md:flex-row gap-4 p-4 max-w-[1200px] w-full mx-auto">
        <div className="flex flex-col flex-1 overflow-hidden">

          <ContentArea
            currentMode={currentMode}
            setCurrentMode={setCurrentMode}
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
            isAutoCorrectEnabled={isAutoCorrectEnabled}
            setIsAutoCorrectEnabled={setIsAutoCorrectEnabled}
          />
        )}

        {currentMode === 'assistant-redacteur' && (
          <AssistantRedacteurSidebar
            isProcessing={isProcessing}
            diffParts={diffParts}
            handleUndo={handleUndo}
            handleManualSubmit={handleManualSubmit}
            isSubmitDisabled={isProcessing || !globalText.trim() || globalText.length > MAX_CHARS}
            isBoosterEnabled={isBoosterEnabled}
            setIsBoosterEnabled={setIsBoosterEnabled}
            isAutoCorrectEnabled={isAutoCorrectEnabled}
            setIsAutoCorrectEnabled={setIsAutoCorrectEnabled}
          />
        )}

        {currentMode === 'traduction' && (
          <TraductionSidebar />
        )}
      </div>
    </div>
  );
}
