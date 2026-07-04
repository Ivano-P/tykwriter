'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import * as Diff from 'diff';
import { ContentArea } from '@/components/ui/ContentArea';
import { CorrecteurSidebar } from '@/components/ui/CorrecteurSidebar';
import { checkSpellingIssuesAction } from '@/actions/spellcheck.action';
import { CorrectionIssue } from '@/services/MistralAiProService';
import { SpellcheckService } from '@/services/SpellcheckService';
import { useText } from '@/lib/TextContext';
import layoutStyles from '../layout.module.css';

const CORRECTEUR_AUTO_DELAY = 3000;
const MAX_CHARS = 2000;
/** Taille maximale du cache de résultats par paragraphe (les plus anciens sont évincés). */
const MAX_CACHE_ENTRIES = 50;

export default function CorrecteurPage() {
  const t = useTranslations('banner');
  // Locale d'interface active : transmise au correcteur pour que les
  // explications d'erreurs soient rédigées dans la langue de l'UI.
  const uiLocale = useLocale();
  const { globalText, setGlobalText } = useText();
  const [correctionIssues, setCorrectionIssues] = useState<CorrectionIssue[]>([]);
  const [isAutoCorrectEnabled, setIsAutoCorrectEnabled] = useState(true);
  // Nombre de paragraphes en cours de vérification (réactif, miroir de inFlightRef)
  const [inFlightCount, setInFlightCount] = useState(0);
  const isProcessing = inFlightCount > 0;

  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [diffParts, setDiffParts] = useState<Diff.Change[] | null>(null);

  const skipDebounceRef = useRef(false);
  // Refs to avoid stale-state issues inside the debounce timer / async handlers
  const globalTextRef = useRef(globalText);
  globalTextRef.current = globalText;
  // Cache des résultats par paragraphe : texte du paragraphe → erreurs LOCALES
  // (occurrence relative au paragraphe). Rebasé vers le texte complet au merge.
  const resultsCacheRef = useRef<Map<string, CorrectionIssue[]>>(new Map());
  // Paragraphes dont la vérification est en vol (évite les appels en double)
  const inFlightRef = useRef<Set<string>>(new Set());

  /**
   * Reconstruit correctionIssues depuis le cache, rebasé sur le texte ACTUEL :
   * seuls les paragraphes présents tels quels dans le texte courant sont
   * fusionnés (un paragraphe modifié pendant un appel est ignoré, son résultat
   * reste en cache pour le jour où il réapparaît). Ordre stable par position.
   */
  const mergeIssuesFromCache = useCallback(() => {
    const fullText = globalTextRef.current;
    if (!fullText.trim()) {
      setCorrectionIssues([]);
      return;
    }

    const paragraphs = SpellcheckService.splitIntoParagraphs(fullText);
    const seenParagraphs = new Set<string>();
    const merged: CorrectionIssue[] = [];

    for (const paragraph of paragraphs) {
      if (!paragraph.text.trim()) continue;
      const cachedIssues = resultsCacheRef.current.get(paragraph.text);
      if (!cachedIssues || cachedIssues.length === 0) continue;

      const rebased = SpellcheckService.rebaseOccurrences(
        cachedIssues,
        paragraph.text,
        paragraph.offset,
        fullText,
      );

      if (seenParagraphs.has(paragraph.text)) {
        // Paragraphe dupliqué : ids dérivés pour que apply/ignore ne visent
        // qu'une seule instance dans la liste affichée.
        merged.push(...rebased.map(issue => ({ ...issue, id: `${issue.id}::${paragraph.offset}` })));
      } else {
        seenParagraphs.add(paragraph.text);
        merged.push(...rebased);
      }
    }

    setCorrectionIssues(merged);
  }, []);

  /** Insère un résultat dans le cache avec éviction des entrées les plus anciennes. */
  const cacheParagraphResult = (paragraphText: string, issues: CorrectionIssue[]) => {
    const cache = resultsCacheRef.current;
    if (cache.has(paragraphText)) cache.delete(paragraphText);
    cache.set(paragraphText, issues);
    while (cache.size > MAX_CACHE_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey === undefined) break;
      cache.delete(oldestKey);
    }
  };

  /** Vérifie UN paragraphe (appel API indépendant) et met le cache à jour. */
  const checkParagraph = useCallback(async (paragraphText: string) => {
    inFlightRef.current.add(paragraphText);
    setInFlightCount(inFlightRef.current.size);
    try {
      const response = await checkSpellingIssuesAction(paragraphText, uiLocale);
      const localIssues = SpellcheckService.processResponse(response, paragraphText);
      cacheParagraphResult(paragraphText, localIssues);
    } catch (error) {
      console.error(error);
    } finally {
      inFlightRef.current.delete(paragraphText);
      setInFlightCount(inFlightRef.current.size);
      mergeIssuesFromCache();
    }
  }, [mergeIssuesFromCache, uiLocale]);

  // Changement de langue d'interface : les explications en cache sont dans
  // l'ancienne langue, on invalide le cache (les nouvelles vérifications
  // repartiront avec la locale active).
  const localeInitializedRef = useRef(false);
  useEffect(() => {
    if (!localeInitializedRef.current) {
      localeInitializedRef.current = true;
      return;
    }
    resultsCacheRef.current.clear();
    setCorrectionIssues([]);
  }, [uiLocale]);

  /**
   * Cycle de vérification : découpe le texte en paragraphes, sert les
   * paragraphes inchangés depuis le cache et lance EN PARALLÈLE un appel
   * par paragraphe nouveau/modifié.
   */
  const runCheckCycle = useCallback((textToCheck: string, forceRecheck = false) => {
    if (!textToCheck.trim() || textToCheck.length > MAX_CHARS) return;
    if (forceRecheck) resultsCacheRef.current.clear();

    const paragraphs = SpellcheckService.splitIntoParagraphs(textToCheck);
    const textsToCheck = new Set<string>();
    paragraphs.forEach(paragraph => {
      if (!paragraph.text.trim()) return;
      if (resultsCacheRef.current.has(paragraph.text)) return;
      if (inFlightRef.current.has(paragraph.text)) return;
      textsToCheck.add(paragraph.text);
    });

    // Affiche immédiatement les erreurs des paragraphes déjà en cache
    mergeIssuesFromCache();
    textsToCheck.forEach(text => {
      void checkParagraph(text);
    });
  }, [checkParagraph, mergeIssuesFromCache]);

  // Auto spellcheck effect with debounce
  useEffect(() => {
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return;
    }

    if (globalText.trim() === '' || globalText.length > MAX_CHARS || !isAutoCorrectEnabled) {
      return;
    }

    const timer = setTimeout(() => {
      runCheckCycle(globalTextRef.current);
    }, CORRECTEUR_AUTO_DELAY);
    return () => clearTimeout(timer);
  }, [globalText, isAutoCorrectEnabled, runCheckCycle]);

  /** Soumission manuelle : force la re-vérification de TOUS les paragraphes. */
  const handleManualSubmit = () => {
    runCheckCycle(globalTextRef.current, true);
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
    // Retire aussi l'erreur du cache pour qu'un merge ultérieur ne la ressuscite pas
    const baseId = issueToIgnore.id.split('::')[0];
    resultsCacheRef.current.forEach((issues, key) => {
      if (issues.some(issue => issue.id === baseId)) {
        resultsCacheRef.current.set(key, issues.filter(issue => issue.id !== baseId));
      }
    });
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
        resultsCacheRef.current.clear();
        setCorrectionIssues([]);
      } else {
        setCorrectionIssues(prev =>
          SpellcheckService.reconcileIssuesAfterEdit(val, prev)
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

  // Soumission désactivée quand chaque paragraphe est déjà en cache ou en vol
  // (équivalent par paragraphe de l'ancien garde globalText === lastCheckedText).
  const allParagraphsHandled = SpellcheckService.splitIntoParagraphs(globalText).every(
    paragraph =>
      !paragraph.text.trim() ||
      resultsCacheRef.current.has(paragraph.text) ||
      inFlightRef.current.has(paragraph.text)
  );
  const isSubmitDisabled =
    !globalText.trim() || globalText.length > MAX_CHARS || allParagraphsHandled;

  return (
    <>
      <div className={layoutStyles.headerBanner}>
        <h1 className={layoutStyles.headerTitle}>
          {t('title')}
        </h1>
        <p className={layoutStyles.headerSubtitle}>
          {t('correcteurSubtitle')}
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
          isSubmitDisabled={isSubmitDisabled}
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
