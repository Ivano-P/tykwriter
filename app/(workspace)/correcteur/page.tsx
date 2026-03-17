'use client';

import { useState, useRef, useEffect } from 'react';
import * as Diff from 'diff';
import { ContentArea } from '@/components/ui/ContentArea';
import { CorrecteurSidebar } from '@/components/ui/CorrecteurSidebar';
import { checkSpellingIssuesAction } from '@/actions/spellcheck.action';
import { spellcheckAction } from '@/actions/spellcheck.action';
import { CorrectionIssue } from '@/services/MistralAiProService';
import { SpellcheckService } from '@/services/SpellcheckService';
import { AutoCorrect } from '@/services/AutoCorrect';
import { useText } from '@/lib/TextContext';
import layoutStyles from '../layout.module.css';

const CORRECTEUR_AUTO_DELAY = 3000;
const MAX_CHARS = 2000;

export default function CorrecteurPage() {
  const { globalText, setGlobalText } = useText();
  const [correctionIssues, setCorrectionIssues] = useState<CorrectionIssue[]>([]);
  const [lastCheckedText, setLastCheckedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoCorrectEnabled, setIsAutoCorrectEnabled] = useState(true);

  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [diffParts, setDiffParts] = useState<Diff.Change[] | null>(null);

  const skipDebounceRef = useRef(false);

  // Auto spellcheck effect with debounce
  useEffect(() => {
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return;
    }

    if (globalText.trim() === '' || isProcessing || globalText.length > MAX_CHARS || !isAutoCorrectEnabled) {
      return;
    }

    const timer = setTimeout(() => {
      handleAutoSpellcheckIssues(globalText);
    }, CORRECTEUR_AUTO_DELAY);
    return () => clearTimeout(timer);
  }, [globalText, isAutoCorrectEnabled, isProcessing]);

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

  const handleManualSubmit = () => {
    skipDebounceRef.current = true;
    handleAutoSpellcheckIssues(globalText);
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

  const handleChange = (val: string) => {
    const SKIP_SPELLCHECK_ON_DELETE = true;

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

  return (
    <>
      <div className={layoutStyles.headerBanner}>
        <h1 className={layoutStyles.headerTitle}>
          Votre Assistant de Rédaction et Correcteur de Précision.
        </h1>
        <p className={layoutStyles.headerSubtitle}>
          Éliminez les fautes d&apos;orthographe, de grammaire et de syntaxe, tout en préservant votre style et votre voix unique.
        </p>
      </div>

      <div className={layoutStyles.workspaceContent}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <ContentArea
            currentMode="correcteur"
            text={globalText}
            onChange={handleChange}
            isProcessing={isProcessing}
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
      </div>
    </>
  );
}
