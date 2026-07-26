'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Copy, Check } from 'lucide-react';
import { ContentArea } from '@/components/ui/ContentArea';
import { TraductionSidebar } from '@/components/ui/TraductionSidebar';
import {
  TARGET_LANGUAGES,
  SOURCE_LANGUAGES,
  sanitizeTargetLanguage,
  sanitizeSourceLanguage,
  targetToSourceLanguage,
  sourceToTargetLanguage,
  ALTERNATIVES_DELIMITER,
  MAX_ALTERNATIVES,
  type TargetLanguage,
  type SourceLanguage,
  type TraductionResponse,
} from '@/services/prompts/traduction.prompt';
import { useText } from '@/lib/TextContext';
import layoutStyles from '../layout.module.css';
import styles from './traduction.module.css';

/** Pause de saisie avant le déclenchement automatique de la traduction. */
const TRADUCTION_AUTO_DELAY = 2000;
const MAX_CHARS = 2000;
/** Taille maximale du cache de traductions (clé : source + cible + texte). */
const MAX_CACHE_ENTRIES = 30;

type TranslationError = 'failed' | null;

export default function TraductionPage() {
  const t = useTranslations('banner');
  const tp = useTranslations('traductionPage');
  const uiLocale = useLocale();
  const { globalText, setGlobalText } = useText();

  // Défauts pilotés par la langue de l'UI : source = langue de l'app,
  // cible = l'autre langue principale (FR <-> EN).
  const [sourceLanguage, setSourceLanguage] = useState<SourceLanguage>(
    uiLocale === 'fr' ? 'fr' : 'en'
  );
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>(
    uiLocale === 'fr' ? 'en-US' : 'fr'
  );
  const [result, setResult] = useState<TraductionResponse | null>(null);
  // Texte traduit affiché progressivement pendant le streaming (vidé à la fin)
  const [streamText, setStreamText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<TranslationError>(null);
  const [justCopied, setJustCopied] = useState(false);
  const [justCopiedSource, setJustCopiedSource] = useState(false);

  // Cache des traductions déjà obtenues (évite de re-payer un appel identique)
  const cacheRef = useRef<Map<string, TraductionResponse>>(new Map());
  const globalTextRef = useRef(globalText);
  globalTextRef.current = globalText;
  // Requête de traduction en vol : annulée dès que la saisie ou la langue change
  const abortRef = useRef<AbortController | null>(null);

  /** Noms de langues affichés dans la langue de l'UI (natif, sans catalogue). */
  const languageNames = useMemo(
    () => new Intl.DisplayNames([uiLocale], { type: 'language' }),
    [uiLocale]
  );
  const labelOf = useCallback(
    (code: string): string => {
      try {
        return languageNames.of(code) ?? code;
      } catch {
        return code;
      }
    },
    [languageNames]
  );

  // Langue détectée par le service (affichée côté ENTRÉE quand source = auto)
  const detectedLabel =
    result && result.langue_detectee && result.langue_detectee !== 'und'
      ? labelOf(result.langue_detectee)
      : null;

  // Sélecteur de langue SOURCE (barre d'outils, côté saisie).
  // L'option "auto" affiche la langue détectée dès qu'elle est connue.
  const sourceOptions = useMemo(
    () =>
      SOURCE_LANGUAGES.map((lang) => ({
        value: lang,
        label:
          lang === 'auto'
            ? detectedLabel
              ? tp('sourceAutoDetected', { language: detectedLabel })
              : tp('sourceAuto')
            : labelOf(lang),
      })),
    [detectedLabel, labelOf, tp]
  );

  /**
   * Réaligne la direction de traduction sur la langue DÉTECTÉE :
   * - texte déjà dans la langue CIBLE (ex: fr→en réglé, texte anglais saisi) :
   *   la direction s'inverse — la cible devient l'ancienne source (ou l'autre
   *   langue principale) et la source reflète la langue détectée. Le debounce
   *   relance alors la traduction dans le bon sens.
   * - simple contradiction avec une source explicite : le sélecteur bascule
   *   sur Auto pour afficher la langue réellement détectée.
   */
  const reconcileDirection = useCallback(
    (response: TraductionResponse, declaredSource: SourceLanguage, target: TargetLanguage) => {
      if (!response.est_supportee || !response.langue_detectee) return;
      const detected = response.langue_detectee;
      if (!(SOURCE_LANGUAGES as readonly string[]).includes(detected) || detected === 'auto') return;

      if (detected === targetToSourceLanguage(target)) {
        // Le texte est déjà dans la langue cible : on inverse la direction.
        const newTarget =
          declaredSource !== 'auto' && declaredSource !== detected
            ? sourceToTargetLanguage(declaredSource)
            : detected === 'fr' ? 'en-US' : 'fr';
        setSourceLanguage(detected as SourceLanguage);
        setTargetLanguage(newTarget);
      } else if (declaredSource !== 'auto' && detected !== declaredSource) {
        setSourceLanguage('auto');
      }
    },
    []
  );

  const runTranslation = useCallback(
    async (text: string, target: TargetLanguage, source: SourceLanguage, force = false) => {
      const cacheKey = `${source}::${target}::${text}`;
      if (!force) {
        const cached = cacheRef.current.get(cacheKey);
        if (cached) {
          setResult(cached);
          setError(null);
          reconcileDirection(cached, source, target);
          return;
        }
      }

      // Une seule traduction en vol : la précédente est annulée (l'annulation
      // remonte jusqu'à l'appel Mistral, qui cesse de générer et de facturer).
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsTranslating(true);
      setError(null);
      setStreamText('');
      try {
        const resp = await fetch('/api/traduction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, targetLanguage: target, sourceLanguage: source }),
          signal: controller.signal,
        });
        if (!resp.ok || !resp.body) throw new Error('Translation request failed');

        // Protocole : 1re ligne = en-tête JSON {langue_detectee, est_supportee},
        // suite = texte traduit brut, affiché au fil de l'eau.
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let header: { langue_detectee: string; est_supportee: boolean } | null = null;
        let body = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (value) buffer += decoder.decode(value, { stream: true });

          if (!header) {
            const newlineIndex = buffer.indexOf('\n');
            if (newlineIndex !== -1) {
              const headerLine = buffer.slice(0, newlineIndex).trim();
              buffer = buffer.slice(newlineIndex + 1);
              const parsed = JSON.parse(headerLine); // en-tête illisible -> catch global
              if (
                typeof parsed.langue_detectee !== 'string' ||
                typeof parsed.est_supportee !== 'boolean'
              ) {
                throw new Error('Malformed translation stream header');
              }
              header = parsed;
              // L'en-tête pilote immédiatement le libellé de détection et la
              // bannière « langue non prise en charge ».
              setResult({ ...parsed, traduction: '' });
            }
          }
          if (header && header.est_supportee && buffer) {
            body += buffer;
            buffer = '';
            // Sans les sauts de ligne d'amorce ni la section des alternatives,
            // pour un rendu propre au fil de l'eau
            const delimiterIndex = body.indexOf(ALTERNATIVES_DELIMITER);
            const mainPart = delimiterIndex === -1 ? body : body.slice(0, delimiterIndex);
            setStreamText(mainPart.replace(/^\n+/, ''));
          }

          if (done) break;
        }

        if (!header) throw new Error('Empty translation stream');

        // Sépare la traduction principale des alternatives éventuelles
        const delimiterIndex = body.indexOf(ALTERNATIVES_DELIMITER);
        const mainTranslation = (delimiterIndex === -1 ? body : body.slice(0, delimiterIndex)).trim();
        const alternatives =
          delimiterIndex === -1
            ? []
            : body
                .slice(delimiterIndex + ALTERNATIVES_DELIMITER.length)
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && line !== mainTranslation)
                .slice(0, MAX_ALTERNATIVES);

        const response: TraductionResponse = {
          langue_detectee: header.langue_detectee,
          est_supportee: header.est_supportee,
          traduction: header.est_supportee ? mainTranslation : '',
          alternatives: alternatives.length > 0 ? alternatives : undefined,
        };
        const cache = cacheRef.current;
        if (cache.has(cacheKey)) cache.delete(cacheKey);
        cache.set(cacheKey, response);
        while (cache.size > MAX_CACHE_ENTRIES) {
          const oldestKey = cache.keys().next().value;
          if (oldestKey === undefined) break;
          cache.delete(oldestKey);
        }
        setResult(response);
        setStreamText('');
        reconcileDirection(response, source, target);
      } catch (err) {
        if (controller.signal.aborted) return; // annulation volontaire : silencieux
        console.error(err);
        setError('failed');
        setStreamText('');
      } finally {
        // Ne pas éteindre l'indicateur d'une nouvelle requête depuis une ancienne
        if (abortRef.current === controller) setIsTranslating(false);
      }
    },
    [reconcileDirection]
  );

  // Traduction automatique après une pause de saisie (ou un changement de langue).
  // Le nettoyage annule aussi la requête en vol : reprendre la saisie interrompt
  // immédiatement le streaming en cours.
  useEffect(() => {
    if (globalText.trim() === '' || globalText.length > MAX_CHARS) {
      abortRef.current?.abort();
      setResult(null);
      setError(null);
      setStreamText('');
      return;
    }

    const timer = setTimeout(() => {
      runTranslation(globalTextRef.current, targetLanguage, sourceLanguage);
    }, TRADUCTION_AUTO_DELAY);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [globalText, targetLanguage, sourceLanguage, runTranslation]);

  const handleChange = (val: string) => {
    if (val.length <= MAX_CHARS) {
      setGlobalText(val);
    }
  };

  /** Lancement manuel : traduction immédiate, sans attendre le debounce ni le cache. */
  const handleManualTranslate = () => {
    runTranslation(globalTextRef.current, targetLanguage, sourceLanguage, true);
  };
  const isManualTranslateDisabled =
    isTranslating || !globalText.trim() || globalText.length > MAX_CHARS;

  /** Remplace la traduction affichée par l'alternative choisie (et permute les deux). */
  const handlePickAlternative = (alternative: string) => {
    if (!result?.est_supportee) return;
    const swapped: TraductionResponse = {
      ...result,
      traduction: alternative,
      alternatives: [
        result.traduction,
        ...(result.alternatives ?? []).filter(a => a !== alternative),
      ].slice(0, MAX_ALTERNATIVES),
    };
    setResult(swapped);
    // Le cache reflète le choix pour que le pair courant le resserve tel quel
    cacheRef.current.set(`${sourceLanguage}::${targetLanguage}::${globalText}`, swapped);
  };

  const handleCopyTranslation = () => {
    if (!result?.traduction) return;
    navigator.clipboard.writeText(result.traduction).then(() => {
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    }).catch(console.error);
  };

  const handleCopySource = () => {
    if (!globalText) return;
    navigator.clipboard.writeText(globalText).then(() => {
      setJustCopiedSource(true);
      setTimeout(() => setJustCopiedSource(false), 1500);
    }).catch(console.error);
  };

  const showUnsupported = result !== null && !result.est_supportee;
  // Pendant le streaming, streamText grandit au fil de l'eau ; à la fin il est
  // vidé et le résultat final (mis en cache) prend le relais.
  const translationText =
    streamText || (result && result.est_supportee ? result.traduction : '');

  // Options du sélecteur de langue CIBLE (barre d'outils, côté sortie/droite)
  const targetOptions = useMemo(
    () => TARGET_LANGUAGES.map((lang) => ({ value: lang, label: labelOf(lang) })),
    [labelOf]
  );

  // Langue source EFFECTIVE pour l'inversion : la sélection explicite, sinon
  // la langue détectée (source = Auto). null si l'inversion est impossible.
  const effectiveSource: Exclude<SourceLanguage, 'auto'> | null = (() => {
    if (sourceLanguage !== 'auto') return sourceLanguage;
    const detected = result?.langue_detectee;
    if (detected && (SOURCE_LANGUAGES as readonly string[]).includes(detected) && detected !== 'auto') {
      return detected as Exclude<SourceLanguage, 'auto'>;
    }
    return null;
  })();

  /**
   * Inverse les langues source et cible. Si une traduction est affichée, les
   * TEXTES sont aussi échangés : la traduction devient la saisie, et l'ancienne
   * saisie devient la sortie — instantanément et sans appel API, puisqu'elle
   * est par construction la traduction exacte dans le sens inverse (le cache
   * est pré-alimenté avec cette paire).
   */
  const handleSwapLanguages = () => {
    if (!effectiveSource) return;
    const newSource = targetToSourceLanguage(targetLanguage);
    const newTarget = sourceToTargetLanguage(effectiveSource);
    const currentTranslation = result?.est_supportee ? result.traduction : '';
    const currentInput = globalText;

    setSourceLanguage(newSource);
    setTargetLanguage(newTarget);

    if (currentTranslation && currentTranslation.length <= MAX_CHARS) {
      const seeded: TraductionResponse = {
        langue_detectee: newSource,
        est_supportee: true,
        traduction: currentInput,
      };
      cacheRef.current.set(`${newSource}::${newTarget}::${currentTranslation}`, seeded);
      setGlobalText(currentTranslation);
      setResult(seeded);
      setStreamText('');
      setError(null);
    }
  };

  /**
   * Garde anti-doublon : choisir comme source la langue de la cible (ou
   * inversement) bascule l'autre côté sur l'ancienne valeur — jamais la même
   * langue des deux côtés. La détection Auto n'est pas concernée.
   */
  const handleSourceChange = (value: string) => {
    const next = sanitizeSourceLanguage(value);
    if (next !== 'auto' && next === targetToSourceLanguage(targetLanguage)) {
      setTargetLanguage(
        effectiveSource
          ? sourceToTargetLanguage(effectiveSource)
          : next === 'fr' ? 'en-US' : 'fr'
      );
    }
    setSourceLanguage(next);
  };

  const handleTargetChange = (value: string) => {
    const next = sanitizeTargetLanguage(value);
    if (sourceLanguage !== 'auto' && targetToSourceLanguage(next) === sourceLanguage) {
      setSourceLanguage(targetToSourceLanguage(targetLanguage));
    }
    setTargetLanguage(next);
  };

  // En-tête du panneau SOURCE : bouton Copier symétrique de celui de la sortie
  // (le bouton Copier de la barre d'outils est masqué en mode traduction).
  const sourcePaneHeader = (
    <div className={styles.outputHeader}>
      <span />
      <button
        className={styles.copyButton}
        onClick={handleCopySource}
        disabled={!globalText}
        title={tp('copySource')}
      >
        {justCopiedSource ? <Check size={14} /> : <Copy size={14} />}
        {justCopiedSource ? tp('copied') : tp('copy')}
      </button>
    </div>
  );

  const translationPane = (
    <div className={styles.outputPane}>
      <div className={styles.outputHeader}>
        <span />
        {isTranslating ? (
          <span className={styles.translating}>{tp('translating')}</span>
        ) : (
          <button
            className={styles.copyButton}
            onClick={handleCopyTranslation}
            disabled={!translationText}
            title={tp('copyTranslation')}
          >
            {justCopied ? <Check size={14} /> : <Copy size={14} />}
            {justCopied ? tp('copied') : tp('copy')}
          </button>
        )}
      </div>

      {showUnsupported && (
        <div className={styles.errorBanner}>
          {detectedLabel
            ? tp('unsupportedWithLanguage', { language: detectedLabel })
            : tp('unsupported')}
        </div>
      )}
      {error === 'failed' && (
        <div className={styles.errorBanner}>{tp('failed')}</div>
      )}

      {translationText ? (
        <div className={styles.outputText}>{translationText}</div>
      ) : (
        <div className={styles.outputPlaceholder}>{tp('placeholder')}</div>
      )}
    </div>
  );

  return (
    <>
      <div className={layoutStyles.headerBanner}>
        <h1 className={layoutStyles.headerTitle}>{t('title')}</h1>
        <p className={layoutStyles.headerSubtitle}>{t('traductionSubtitle')}</p>
      </div>

      <div className={layoutStyles.workspaceContent}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <ContentArea
            currentMode="traduction"
            text={globalText}
            onChange={handleChange}
            isProcessing={false}
            undoStackLength={0}
            redoStackLength={0}
            handleUndo={() => {}}
            handleRedo={() => {}}
            MAX_CHARS={MAX_CHARS}
            translationPane={translationPane}
            sourcePaneHeader={sourcePaneHeader}
            languageOptions={sourceOptions}
            languageValue={sourceLanguage}
            onLanguageChange={handleSourceChange}
            targetLanguageOptions={targetOptions}
            targetLanguageValue={targetLanguage}
            onTargetLanguageChange={handleTargetChange}
            targetLanguageTitle={tp('targetLanguage')}
            onSwapLanguages={handleSwapLanguages}
            swapLanguagesDisabled={!effectiveSource}
          />
        </div>

        <TraductionSidebar
          isTranslating={isTranslating}
          onManualTranslate={handleManualTranslate}
          isTranslateDisabled={isManualTranslateDisabled}
          alternatives={result?.est_supportee ? result.alternatives ?? [] : []}
          onPickAlternative={handlePickAlternative}
        />
      </div>
    </>
  );
}
