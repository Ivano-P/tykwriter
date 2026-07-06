'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import * as Diff from 'diff';
import { ContentArea } from '@/components/ui/ContentArea';
import { AssistantRedacteurSidebar } from '@/components/ui/AssistantRedacteurSidebar';
import { spellcheckAction } from '@/actions/spellcheck.action';
import { AutoCorrect } from '@/services/AutoCorrect';
import { ChunkManager } from '@/services/ChunkManager';
import { formatEmailText } from '@/lib/utils';
import { useText } from '@/lib/TextContext';
import type { AssistantTone, AssistantAbreviations } from '@/services/prompts/assistantRedacteur.prompt';
import {
  WRITING_LANGUAGES,
  writingLanguageToVariant,
  sanitizeWritingLanguage,
  type WritingLanguage,
} from '@/services/prompts/englishVariant';
import { MAX_APPLIED_CORRECTIONS, type AppliedCorrection } from '@/services/prompts/finalCheck.prompt';
import layoutStyles from '../layout.module.css';

const ASSISTANT_REDACTEUR_DELAY = 5000;
const MAX_CHARS = 2000;
/** Pause d'écriture après laquelle la vérification finale (texte complet) se déclenche. */
const FINAL_CHECK_IDLE_DELAY = 12000;
/** Nouvelle tentative si des corrections de chunks sont encore en vol au moment du déclenchement. */
const FINAL_CHECK_RETRY_DELAY = 2000;

export default function AssistantRedacteurPage() {
  const t = useTranslations('banner');
  const uiLocale = useLocale();
  const { globalText, setGlobalText } = useText();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoCorrectEnabled, setIsAutoCorrectEnabled] = useState(true);
  const [isFinalCheckEnabled, setIsFinalCheckEnabled] = useState(true);
  const [isFinalChecking, setIsFinalChecking] = useState(false);
  const [isLinkEnabled, setIsLinkEnabled] = useState(false);

  // Options d'écriture (ton + abréviations + variante d'anglais) injectées dans le prompt système
  const [tone, setTone] = useState<AssistantTone>('auto');
  const [abreviations, setAbreviations] = useState<AssistantAbreviations>('conserver');
  // Langue d'écriture du sélecteur (auto/fr/en-US/en-GB) ; la variante
  // d'anglais injectée dans le prompt en est dérivée.
  const [writingLanguage, setWritingLanguage] = useState<WritingLanguage>('auto');
  const englishVariant = writingLanguageToVariant(writingLanguage);
  // Langue détectée par la dernière correction (affichée sur l'option Auto)
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);

  const tc = useTranslations('contentArea');

  // Options du sélecteur de langue de la barre d'outils, libellées dans la
  // langue de l'UI ; l'option Auto affiche la langue détectée dès qu'elle est connue.
  const languageOptions = useMemo(() => {
    const names = new Intl.DisplayNames([uiLocale], { type: 'language' });
    const labelOf = (code: string) => {
      try {
        return names.of(code) ?? code;
      } catch {
        return code;
      }
    };
    return WRITING_LANGUAGES.map((lang) => ({
      value: lang,
      label:
        lang === 'auto'
          ? detectedLanguage
            ? tc('languageAutoDetected', { language: labelOf(detectedLanguage) })
            : tc('languageAuto')
          : labelOf(lang),
    }));
  }, [uiLocale, detectedLanguage, tc]);

  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [diffParts, setDiffParts] = useState<Diff.Change[] | null>(null);

  const skipDebounceRef = useRef(false);
  const pendingRequestsRef = useRef<Map<string, AbortController>>(new Map());
  const processedCacheRef = useRef<Map<string, { correctedText: string; isPartial: boolean; hasChanges: boolean }>>(new Map());
  const processingBlocksRef = useRef<Set<string>>(new Set());
  const latestGlobalTextRef = useRef(globalText);

  // ── Vérification finale (passe globale de réconciliation) ──────────
  // Journal des corrections inline appliquées pendant la session de saisie,
  // consommé (vidé) après chaque passe finale réussie.
  const appliedCorrectionsRef = useRef<AppliedCorrection[]>([]);
  // Dernier texte validé par une passe finale : la passe ne re-tourne jamais
  // tant que le texte n'a pas changé depuis (garde anti-boucle).
  const lastFinalCheckedTextRef = useRef('');
  const finalCheckInFlightRef = useRef(false);
  const finalCheckRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runFinalCheckRef = useRef<() => void>(() => {});

  useEffect(() => {
    latestGlobalTextRef.current = globalText;
  }, [globalText]);

  // When a writing option changes, invalidate everything so the existing text
  // is re-processed with the new options. Declared BEFORE the hybrid trigger
  // effect so the cache is already cleared when it re-runs on the same render.
  const optionsInitializedRef = useRef(false);
  useEffect(() => {
    if (!optionsInitializedRef.current) {
      optionsInitializedRef.current = true;
      return;
    }
    pendingRequestsRef.current.forEach(c => c.abort());
    pendingRequestsRef.current.clear();
    processingBlocksRef.current.clear();
    processedCacheRef.current.clear();
    // Le journal des corrections et la garde de la passe finale se réfèrent
    // aux anciennes options : on repart de zéro.
    appliedCorrectionsRef.current = [];
    lastFinalCheckedTextRef.current = '';
  }, [tone, abreviations, englishVariant]);

  const triggerAssistantApi = useCallback(async (originalText: string, isComplete: boolean) => {
    const controller = new AbortController();
    pendingRequestsRef.current.set(originalText, controller);
    processingBlocksRef.current.add(originalText);

    try {
      const resp = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: originalText, options: { tone, abreviations, englishVariant } }),
        signal: controller.signal
      });

      if (!resp.ok) {
        throw new Error('API Request failed');
      }

      const data = await resp.json();
      const correctedText = data.correctedText;
      // Alimente l'indicateur « Auto : {langue} » du sélecteur de la barre d'outils
      if (typeof data.detectedLanguage === 'string' && data.detectedLanguage) {
        setDetectedLanguage(data.detectedLanguage);
      }
      const processed = AutoCorrect.processCorrections(originalText, correctedText);

      processedCacheRef.current.set(originalText, {
        correctedText,
        isPartial: !isComplete,
        hasChanges: processed.hasChanges
      });

      if (processed.hasChanges) {
        // Journalise la correction inline pour la passe de vérification finale.
        appliedCorrectionsRef.current.push({ original: originalText, corrected: correctedText });
        if (appliedCorrectionsRef.current.length > MAX_APPLIED_CORRECTIONS) {
          appliedCorrectionsRef.current = appliedCorrectionsRef.current.slice(-MAX_APPLIED_CORRECTIONS);
        }

        window.dispatchEvent(new CustomEvent('tyk:replaceText', {
          detail: { oldText: originalText, newText: correctedText }
        }));

        // The editor republishes the corrected text as globalText (onUpdate) and
        // the trigger effect re-splits it into blocks. The correction may add new
        // paragraph boundaries, so pre-cache every re-split chunk (and trimmed
        // variants), not just the whole string, so the corrected text is not
        // immediately re-sent to the API.
        const markProcessed = (text: string) => {
          if (!text.trim()) return;
          processedCacheRef.current.set(text, { correctedText: text, isPartial: false, hasChanges: false });
          const trimmed = text.trim();
          if (trimmed !== text) {
            processedCacheRef.current.set(trimmed, { correctedText: trimmed, isPartial: false, hasChanges: false });
          }
        };
        markProcessed(correctedText);
        ChunkManager.splitIntoBlocks(correctedText).forEach(chunk => markProcessed(chunk.originalText));

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
  }, [tone, abreviations, englishVariant]);

  // Non-blocking Hybrid Trigger for Assistant Rédacteur
  useEffect(() => {
    if (!isAutoCorrectEnabled || globalText.trim() === '') {
      if (globalText.trim() === '') {
        pendingRequestsRef.current.forEach(c => c.abort());
        pendingRequestsRef.current.clear();
        processingBlocksRef.current.clear();
        processedCacheRef.current.clear();
        appliedCorrectionsRef.current = [];
        lastFinalCheckedTextRef.current = '';
        setDetectedLanguage(null);
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
  }, [globalText, isAutoCorrectEnabled, triggerAssistantApi]);

  // ── Vérification finale : passe globale après une pause d'écriture ──
  // Relit le texte COMPLET (mistral-medium) pour réconcilier les corrections
  // inline (appliquées phrase par phrase, sans contexte) avec le contexte global.
  const runFinalCheck = useCallback(async () => {
    if (finalCheckInFlightRef.current) return;
    if (!isFinalCheckEnabled || !isAutoCorrectEnabled) return;

    const sentText = latestGlobalTextRef.current;
    if (!sentText.trim() || sentText.length > MAX_CHARS) return;
    if (sentText.trim() === lastFinalCheckedTextRef.current.trim()) return;

    // Des corrections de chunks sont encore en vol : on réessaie un peu plus
    // tard plutôt que d'abandonner la passe (le texte peut ne plus changer).
    if (pendingRequestsRef.current.size > 0 || processingBlocksRef.current.size > 0) {
      if (finalCheckRetryRef.current) clearTimeout(finalCheckRetryRef.current);
      finalCheckRetryRef.current = setTimeout(() => runFinalCheckRef.current(), FINAL_CHECK_RETRY_DELAY);
      return;
    }

    finalCheckInFlightRef.current = true;
    setIsFinalChecking(true);

    try {
      const resp = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sentText,
          options: { tone, abreviations, englishVariant },
          mode: 'final',
          appliedCorrections: appliedCorrectionsRef.current,
        }),
      });

      if (!resp.ok) {
        throw new Error('Final check API request failed');
      }

      const data = await resp.json();
      const correctedText: string = data.correctedText;
      if (typeof correctedText !== 'string') {
        throw new Error('Invalid final check response');
      }

      // L'utilisateur a tapé pendant l'appel : le résultat est périmé, on le
      // jette sans toucher aux gardes (la nouvelle saisie relancera une passe).
      if (latestGlobalTextRef.current !== sentText) return;

      const processed = AutoCorrect.processCorrections(sentText, correctedText);

      if (!processed.hasChanges) {
        lastFinalCheckedTextRef.current = sentText;
        appliedCorrectionsRef.current = [];
        return;
      }

      // Pré-cache les chunks du texte final (clés brutes + trimmed) pour que
      // le pipeline de correction par chunks ne re-traite pas le résultat.
      const cacheAsProcessed = (key: string) => {
        processedCacheRef.current.set(key, { correctedText: key, isPartial: false, hasChanges: false });
        const trimmed = key.trim();
        if (trimmed && trimmed !== key) {
          processedCacheRef.current.set(trimmed, { correctedText: trimmed, isPartial: false, hasChanges: false });
        }
      };
      ChunkManager.splitIntoBlocks(correctedText).forEach(chunk => cacheAsProcessed(chunk.originalText));
      cacheAsProcessed(correctedText);

      lastFinalCheckedTextRef.current = correctedText;
      appliedCorrectionsRef.current = [];

      window.dispatchEvent(new CustomEvent('tyk:replaceText', {
        detail: { oldText: sentText, newText: correctedText }
      }));

      setUndoStack((prev) => [...prev, sentText]);
      setRedoStack([]);
      setDiffParts(processed.diffParts);
      skipDebounceRef.current = true;
    } catch (err) {
      console.error('Final check error:', err);
    } finally {
      finalCheckInFlightRef.current = false;
      setIsFinalChecking(false);
    }
  }, [isFinalCheckEnabled, isAutoCorrectEnabled, tone, abreviations, englishVariant]);

  useEffect(() => {
    runFinalCheckRef.current = runFinalCheck;
  }, [runFinalCheck]);

  // Détection de pause d'écriture : toute modification de globalText réarme le
  // minuteur ; la passe ne part que si le texte diffère de la dernière passe.
  useEffect(() => {
    if (finalCheckRetryRef.current) {
      clearTimeout(finalCheckRetryRef.current);
      finalCheckRetryRef.current = null;
    }

    if (!isFinalCheckEnabled || !isAutoCorrectEnabled) return;
    if (globalText.trim() === '' || globalText.length > MAX_CHARS) return;
    if (globalText.trim() === lastFinalCheckedTextRef.current.trim()) return;

    const timeoutId = setTimeout(() => runFinalCheckRef.current(), FINAL_CHECK_IDLE_DELAY);
    return () => {
      clearTimeout(timeoutId);
      if (finalCheckRetryRef.current) {
        clearTimeout(finalCheckRetryRef.current);
        finalCheckRetryRef.current = null;
      }
    };
  }, [globalText, isFinalCheckEnabled, isAutoCorrectEnabled]);

  // Legacy manual check fallback
  const handleSpellCheck = async (textToCheck: string) => {
    if (!textToCheck.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      const result = await spellcheckAction(textToCheck, false, { tone, abreviations, englishVariant });
      if (result.langueDetectee) setDetectedLanguage(result.langueDetectee);
      const processed = AutoCorrect.processCorrections(textToCheck, result.texteCorrige);

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
    // Ne pas relancer la passe finale sur un texte que l'utilisateur vient
    // volontairement de restaurer (elle referait la correction annulée).
    lastFinalCheckedTextRef.current = lastText;
    setGlobalText(lastText);
    setDiffParts(null);
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || isProcessing) return;
    const nextText = redoStack[redoStack.length - 1];

    setUndoStack((prev: string[]) => [...prev, globalText]);
    setRedoStack((prev: string[]) => prev.slice(0, -1));

    skipDebounceRef.current = true;
    lastFinalCheckedTextRef.current = nextText;
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
          {t('title')}
        </h1>
        <p className={layoutStyles.headerSubtitle}>
          {t('assistantSubtitle')}
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
            isLinkEnabled={isLinkEnabled}
            languageOptions={languageOptions}
            languageValue={writingLanguage}
            onLanguageChange={(value) => setWritingLanguage(sanitizeWritingLanguage(value))}
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
          isFinalCheckEnabled={isFinalCheckEnabled}
          setIsFinalCheckEnabled={setIsFinalCheckEnabled}
          isFinalChecking={isFinalChecking}
          handleFormatEmail={handleFormatEmail}
          isLinkEnabled={isLinkEnabled}
          setIsLinkEnabled={setIsLinkEnabled}
          tone={tone}
          setTone={setTone}
          abreviations={abreviations}
          setAbreviations={setAbreviations}
        />
      </div>
    </>
  );
}
