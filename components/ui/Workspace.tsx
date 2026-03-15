'use client';

import { useState, useRef, useEffect } from 'react';
import * as Diff from 'diff';
import { ContentArea } from '@/components/ui/ContentArea';
import { CorrecteurSidebar } from '@/components/ui/CorrecteurSidebar';
import { AssistantRedacteurSidebar } from '@/components/ui/AssistantRedacteurSidebar';
import { TraductionSidebar } from '@/components/ui/TraductionSidebar';
import { spellcheckAction, checkSpellingIssuesAction } from '@/actions/spellcheck.action';
import { CorrectionIssue } from '@/services/MistralAiProService';
import { SpellcheckService } from '@/services/SpellcheckService';
import { AutoCorrect } from '@/services/AutoCorrect';
import { ChunkManager } from '@/services/ChunkManager';

type Mode = "correcteur" | "assistant-redacteur" | "traduction";

export function Workspace({ initialMode = "correcteur" }: { initialMode?: Mode }) {
  const [currentMode, setCurrentMode] = useState<Mode>(initialMode);
  const [globalText, setGlobalText] = useState<string>("");
  const [correctionIssues, setCorrectionIssues] = useState<CorrectionIssue[]>([]);
  const [lastCheckedText, setLastCheckedText] = useState<string>('');
  
  const pendingRequestsRef = useRef<Map<string, AbortController>>(new Map());
  const processedCacheRef = useRef<Map<string, { correctedText: string; isPartial: boolean; hasChanges: boolean }>>(new Map());
  const processingBlocksRef = useRef<Set<string>>(new Set());
  const latestGlobalTextRef = useRef(globalText);
  
  useEffect(() => {
    latestGlobalTextRef.current = globalText;
  }, [globalText]);

  useEffect(() => {
    setCurrentMode(initialMode);
  }, [initialMode]);

  const handleModeChange = (newMode: Mode) => {
    if (newMode === currentMode) return;

    if (globalText) {
      const storedText = globalText;
      
      // 1. Supprimé de la zone de saisie
      setGlobalText('');
      setCorrectionIssues([]);
      setDiffParts(null);
      setUndoStack([]);
      setRedoStack([]);
      setLastCheckedText('');
      setCurrentMode(newMode);
      
      // 2. Coller dans la nouvelle zone de saisie (setTimeout permet à React de rendre la zone vide d'abord)
      setTimeout(() => {
        setGlobalText(storedText);
      }, 50);
    } else {
      setLastCheckedText('');
      setCurrentMode(newMode);
    }
  };

  const applyCorrection = (issueToApply: CorrectionIssue, source: 'sidebar' | 'editor' = 'sidebar') => {
    skipDebounceRef.current = true;
    if (source === 'sidebar') {
      const newText = SpellcheckService.applyCorrectionText(globalText, issueToApply);
      setGlobalText(newText);
    }
    setCorrectionIssues(prev => prev.filter(issue => issue.id !== issueToApply.id));
  };

  const ignoreCorrection = (issueToIgnore: CorrectionIssue) => {
    skipDebounceRef.current = true;
    setCorrectionIssues(prev => prev.filter(issue => issue.id !== issueToIgnore.id));
  };

  const applyAllCorrections = () => {
    skipDebounceRef.current = true;
    const newText = SpellcheckService.applyAllCorrectionsText(globalText, correctionIssues);
    setGlobalText(newText);
    setCorrectionIssues([]);
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoCorrectEnabled, setIsAutoCorrectEnabled] = useState(true);

  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [diffParts, setDiffParts] = useState<Diff.Change[] | null>(null);

  const MAX_CHARS = 2000;

  const skipDebounceRef = useRef(false);
  const autoCorrectDelay: number = 3000; //change the delay time here for auto correct

  useEffect(() => {
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return;
    }

    if (globalText.trim() === '' || isProcessing || globalText.length > MAX_CHARS || currentMode === 'traduction' || !isAutoCorrectEnabled) {
      if (currentMode === 'assistant-redacteur' && globalText.trim() === '') {
        // clear caches when empty
        pendingRequestsRef.current.forEach(c => c.abort());
        pendingRequestsRef.current.clear();
        processingBlocksRef.current.clear();
        processedCacheRef.current.clear();
      }
      return;
    }

    // Correcteur Mode uses debounce
    if (currentMode === 'correcteur') {
      const timer = setTimeout(() => {
        handleAutoSpellcheckIssues(globalText);
      }, autoCorrectDelay);
      return () => clearTimeout(timer);
    }
  }, [globalText, currentMode, isAutoCorrectEnabled, isProcessing]);

  // Assistant Rédacteur Mode (Non-blocking Hybrid Trigger)
  useEffect(() => {
    if (currentMode !== 'assistant-redacteur' || !isAutoCorrectEnabled || globalText.trim() === '') return;

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
      
      // If cached and wasn't a partial chunk that became complete
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
       }, autoCorrectDelay);
       return () => clearTimeout(timeoutId);
    }
  }, [globalText, currentMode, isAutoCorrectEnabled]);

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
        // Dispatch to TiptapEditor to handle text replacement via transaction
        window.dispatchEvent(new CustomEvent('tyk:replaceText', {
          detail: { oldText: originalText, newText: correctedText }
        }));
        
        // set history based on the latest known text
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

  const handleAutoSpellcheckIssues = async (textToCheck: string) => {
    if (!textToCheck.trim() || isProcessing) return;

    if (textToCheck === lastCheckedText) {
      return;
    }

    setIsProcessing(true);
    setCorrectionIssues([]);
    try {
      const response = await checkSpellingIssuesAction(textToCheck);
      const processedIssues = SpellcheckService.processResponse(response);
      setCorrectionIssues(processedIssues);
      setLastCheckedText(textToCheck);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Legacy manual check fallback if ever required
  const handleSpellCheck = async (textToCheck: string) => {
    if (!textToCheck.trim() || isProcessing || currentMode === 'traduction') return;

    if (textToCheck === lastCheckedText) {
      return;
    }

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
        setLastCheckedText(processed.newText);
      } else {
        setDiffParts([]);
        setLastCheckedText(textToCheck);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChange = (val: string) => {
    // Flag pour activer/désactiver le saut de vérification lors d'une suppression de texte
    //TODO: decide if this should always be on, off or be a user setting
    const SKIP_SPELLCHECK_ON_DELETE = true;

    // Prevent AI call if text is purely being deleted/shortened AND the flag is true
    if (SKIP_SPELLCHECK_ON_DELETE && val.length < globalText.length) {
      skipDebounceRef.current = true;
    }
    
    if (val.length <= MAX_CHARS) {
      setGlobalText(val);
      setDiffParts(null);
      
      if (val.trim() === '') {
        setCorrectionIssues([]);
      } else {
        setCorrectionIssues(prev => 
          prev.filter(issue => val.includes(issue.texte_original))
        );
      }
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
    if (currentMode === 'correcteur') {
      handleAutoSpellcheckIssues(globalText);
    } else {
      // In non-blocking Assistant mode, the auto-sync runs. Manual check could just force evaluating.
      handleSpellCheck(globalText);
    }
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
            setCurrentMode={handleModeChange}
            text={globalText}
            onChange={handleChange}
            isProcessing={currentMode === 'correcteur' ? isProcessing : false}
            undoStackLength={undoStack.length}
            redoStackLength={redoStack.length}
            handleUndo={handleUndo}
            handleRedo={handleRedo}
            MAX_CHARS={MAX_CHARS}
            correctionIssues={correctionIssues}
            applyCorrection={applyCorrection}
            ignoreCorrection={ignoreCorrection}
          />
        </div>

        {currentMode === 'correcteur' && (
          <CorrecteurSidebar
            isProcessing={isProcessing}
            diffParts={diffParts}
            handleUndo={handleUndo}
            handleManualSubmit={handleManualSubmit}
            isSubmitDisabled={isProcessing || !globalText.trim() || globalText.length > MAX_CHARS || globalText === lastCheckedText}
            isAutoCorrectEnabled={isAutoCorrectEnabled}
            setIsAutoCorrectEnabled={setIsAutoCorrectEnabled}
            globalText={globalText}
            correctionIssues={correctionIssues}
            setCorrectionIssues={setCorrectionIssues}
            applyCorrection={applyCorrection}
            applyAllCorrections={applyAllCorrections}
            ignoreCorrection={ignoreCorrection}
          />
        )}

        {currentMode === 'assistant-redacteur' && (
          <AssistantRedacteurSidebar
            isProcessing={processingBlocksRef.current.size > 0}
            diffParts={diffParts}
            handleUndo={handleUndo}
            handleManualSubmit={handleManualSubmit}
            isSubmitDisabled={processingBlocksRef.current.size > 0 || !globalText.trim() || globalText.length > MAX_CHARS}
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
