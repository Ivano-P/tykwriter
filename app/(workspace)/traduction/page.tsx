'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Copy, Check } from 'lucide-react';
import { ContentArea } from '@/components/ui/ContentArea';
import { TraductionSidebar } from '@/components/ui/TraductionSidebar';
import { translateAction } from '@/actions/traduction.action';
import {
  TARGET_LANGUAGES,
  SOURCE_LANGUAGES,
  sanitizeTargetLanguage,
  sanitizeSourceLanguage,
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
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<TranslationError>(null);
  const [justCopied, setJustCopied] = useState(false);

  // Cache des traductions déjà obtenues (évite de re-payer un appel identique)
  const cacheRef = useRef<Map<string, TraductionResponse>>(new Map());
  const globalTextRef = useRef(globalText);
  globalTextRef.current = globalText;

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

  const runTranslation = useCallback(
    async (text: string, target: TargetLanguage, source: SourceLanguage) => {
      const cacheKey = `${source}::${target}::${text}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setResult(cached);
        setError(null);
        return;
      }

      setIsTranslating(true);
      setError(null);
      try {
        const response = await translateAction(text, target, source);
        const cache = cacheRef.current;
        if (cache.has(cacheKey)) cache.delete(cacheKey);
        cache.set(cacheKey, response);
        while (cache.size > MAX_CACHE_ENTRIES) {
          const oldestKey = cache.keys().next().value;
          if (oldestKey === undefined) break;
          cache.delete(oldestKey);
        }
        // Résultat périmé (texte modifié pendant l'appel) : on le met en cache
        // mais on ne l'affiche pas, le debounce actif relancera la bonne paire.
        if (globalTextRef.current !== text) return;
        setResult(response);
      } catch (err) {
        console.error(err);
        if (globalTextRef.current === text) setError('failed');
      } finally {
        setIsTranslating(false);
      }
    },
    []
  );

  // Traduction automatique après une pause de saisie (ou un changement de langue)
  useEffect(() => {
    if (globalText.trim() === '' || globalText.length > MAX_CHARS) {
      setResult(null);
      setError(null);
      return;
    }

    const timer = setTimeout(() => {
      runTranslation(globalTextRef.current, targetLanguage, sourceLanguage);
    }, TRADUCTION_AUTO_DELAY);
    return () => clearTimeout(timer);
  }, [globalText, targetLanguage, sourceLanguage, runTranslation]);

  const handleChange = (val: string) => {
    if (val.length <= MAX_CHARS) {
      setGlobalText(val);
    }
  };

  const handleCopyTranslation = () => {
    if (!result?.traduction) return;
    navigator.clipboard.writeText(result.traduction).then(() => {
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    }).catch(console.error);
  };

  const showUnsupported = result !== null && !result.est_supportee;
  const translationText = result && result.est_supportee ? result.traduction : '';

  const translationPane = (
    <div className={styles.outputPane}>
      <div className={styles.outputHeader}>
        {/* Langue CIBLE : choisie ici, côté sortie */}
        <select
          className={styles.targetSelect}
          value={targetLanguage}
          onChange={(e) => setTargetLanguage(sanitizeTargetLanguage(e.target.value))}
          title={tp('targetLanguage')}
          aria-label={tp('targetLanguage')}
        >
          {TARGET_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {labelOf(lang)}
            </option>
          ))}
        </select>

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
            languageOptions={sourceOptions}
            languageValue={sourceLanguage}
            onLanguageChange={(value) => setSourceLanguage(sanitizeSourceLanguage(value))}
          />
        </div>

        <TraductionSidebar isTranslating={isTranslating} />
      </div>
    </>
  );
}
