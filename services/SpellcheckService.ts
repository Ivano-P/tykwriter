import * as Diff from 'diff';
import type { CorrectionIssue, CorrectionResponse } from './MistralAiProService';

/** Variantes d'apostrophes normalisées vers l'apostrophe droite. */
const APOSTROPHE_VARIANTS = /['’ʼ‛]/g; // ' ’ ʼ ‛
/** Variantes de tirets/traits d'union normalisées vers le tiret simple. */
const DASH_VARIANTS = /[-–—‑]/g; // - – — ‑

/** Nombre de mots au-delà duquel on tente de réduire une correction "phrase entière". */
const TRIM_WORD_THRESHOLD = 3;

interface ChangedSpan {
  start: number;
  end: number;
}

interface DiffRegion {
  oStart: number;
  oEnd: number;
  cStart: number;
  cEnd: number;
}

export class SpellcheckService {
  /**
   * Normalise les variantes typographiques (apostrophes et tirets)
   * pour comparer deux chaînes indépendamment de la typographie.
   */
  private static normalizeTypography(value: string): string {
    return value.replace(APOSTROPHE_VARIANTS, "'").replace(DASH_VARIANTS, '-');
  }

  /**
   * Vrai si l'erreur ne change que des apostrophes/tirets typographiques
   * (faux positif du modèle : à ignorer).
   */
  private static isTypographyOnlyIssue(issue: CorrectionIssue): boolean {
    return (
      this.normalizeTypography(issue.texte_original) ===
      this.normalizeTypography(issue.correction)
    );
  }

  /** Renvoie les index (non chevauchants) de chaque occurrence de `search` dans `text`. */
  private static findOccurrenceIndexes(text: string, search: string): number[] {
    if (!search) return [];
    const indexes: number[] = [];
    let idx = text.indexOf(search);
    while (idx !== -1) {
      indexes.push(idx);
      idx = text.indexOf(search, idx + search.length);
    }
    return indexes;
  }

  /**
   * Applique une seule correction sur le texte donné, en remplaçant
   * la n-ième occurrence (issue.occurrence) de texte_original.
   * Repli sur la première occurrence si la n-ième n'existe plus.
   * @param text Le texte complet
   * @param issue L'erreur à corriger
   * @returns Le nouveau texte
   */
  static applyCorrectionText(text: string, issue: CorrectionIssue): string {
    const indexes = this.findOccurrenceIndexes(text, issue.texte_original);
    if (indexes.length === 0) return text;

    const nth = issue.occurrence ?? 0;
    const targetIndex = nth >= 0 && nth < indexes.length ? indexes[nth] : indexes[0];

    return (
      text.slice(0, targetIndex) +
      issue.correction +
      text.slice(targetIndex + issue.texte_original.length)
    );
  }

  /**
   * Applique toutes les corrections trouvées sur le texte donné.
   * @param text Le texte complet
   * @param issues La liste des erreurs à corriger
   * @returns Le nouveau texte
   */
  static applyAllCorrectionsText(text: string, issues: CorrectionIssue[]): string {
    let newText = text;
    issues.forEach(issue => {
      newText = this.applyCorrectionText(newText, issue);
    });
    return newText;
  }

  /**
   * Réconcilie la liste d'erreurs après une édition manuelle du texte :
   * supprime les erreurs dont le texte original a disparu et efface
   * l'index d'occurrence quand il n'est plus valide (repli sur la 1re occurrence).
   */
  static reconcileIssuesAfterEdit(text: string, issues: CorrectionIssue[]): CorrectionIssue[] {
    return issues
      .filter(issue => text.includes(issue.texte_original))
      .map(issue => {
        if (issue.occurrence === undefined || issue.occurrence === 0) return issue;
        const count = this.findOccurrenceIndexes(text, issue.texte_original).length;
        return issue.occurrence < count ? issue : { ...issue, occurrence: undefined };
      });
  }

  /**
   * Réduit une correction "phrase entière" à son (ou ses) plus petit(s)
   * segment(s) de mots réellement modifié(s), via un diff mot à mot.
   * Si plusieurs régions distinctes ont changé, l'erreur est scindée.
   * Garde-fou : chaque texte_original résultant doit être une sous-chaîne
   * non vide du texte vérifié, sinon l'erreur d'origine est conservée telle quelle.
   */
  private static trimIssueToMinimalUnits(
    issue: CorrectionIssue,
    checkedText: string,
  ): CorrectionIssue[] {
    const original = issue.texte_original;
    const correction = issue.correction;
    if (!original || typeof correction !== 'string') return [issue];

    const wordCount = original.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount <= TRIM_WORD_THRESHOLD) return [issue];

    // diffWordsWithSpace : les valeurs concaténées reconstituent exactement
    // chaque chaîne, ce qui permet un suivi fiable des offsets.
    const parts = Diff.diffWordsWithSpace(original, correction);

    const regions: DiffRegion[] = [];
    let current: DiffRegion | null = null;
    let oPos = 0;
    let cPos = 0;

    for (const part of parts) {
      const len = part.value.length;
      if (part.added) {
        if (!current) current = { oStart: oPos, oEnd: oPos, cStart: cPos, cEnd: cPos };
        current.cEnd = cPos + len;
        cPos += len;
      } else if (part.removed) {
        if (!current) current = { oStart: oPos, oEnd: oPos, cStart: cPos, cEnd: cPos };
        current.oEnd = oPos + len;
        oPos += len;
      } else {
        // Segment inchangé : un simple blanc entre deux changements ne clôt
        // pas la région (frontières de mots entiers) ; un mot inchangé, si.
        if (current && !/^\s+$/.test(part.value)) {
          regions.push(current);
          current = null;
        }
        oPos += len;
        cPos += len;
      }
    }
    if (current) regions.push(current);

    if (regions.length === 0) return [issue];

    const trimmedIssues: CorrectionIssue[] = [];
    for (const region of regions) {
      const oText = original.slice(region.oStart, region.oEnd);
      const cText = correction.slice(region.cStart, region.cEnd);

      // Garde-fou : segment vide ou introuvable dans le texte vérifié
      // → on conserve l'erreur d'origine sans la modifier.
      if (!oText || !checkedText.includes(oText)) return [issue];

      trimmedIssues.push({
        ...issue,
        id: regions.length === 1 ? issue.id : crypto.randomUUID(),
        texte_original: oText,
        correction: cText,
      });
    }

    return trimmedIssues;
  }

  /**
   * Calcule les plages de caractères modifiées dans `oldText` par rapport
   * à `newText` (les insertions pures produisent des plages de largeur nulle).
   */
  private static computeChangedSpans(oldText: string, newText: string): ChangedSpan[] {
    const parts = Diff.diffWordsWithSpace(oldText, newText);
    const spans: ChangedSpan[] = [];
    let oPos = 0;

    for (const part of parts) {
      if (part.removed) {
        spans.push({ start: oPos, end: oPos + part.value.length });
        oPos += part.value.length;
      } else if (part.added) {
        spans.push({ start: oPos, end: oPos });
      } else {
        oPos += part.value.length;
      }
    }
    return spans;
  }

  /**
   * Détermine pour chaque erreur l'occurrence fautive de texte_original dans
   * le texte vérifié, de préférence via un diff avec texte_corrige_complet.
   * Repli sur la première occurrence en cas d'ambiguïté.
   */
  private static assignOccurrences(
    issues: CorrectionIssue[],
    checkedText: string,
    correctedFullText?: string,
  ): CorrectionIssue[] {
    const changedSpans = correctedFullText
      ? this.computeChangedSpans(checkedText, correctedFullText)
      : null;
    const claimed = new Map<string, Set<number>>();

    return issues.map(issue => {
      const positions = this.findOccurrenceIndexes(checkedText, issue.texte_original);
      if (positions.length === 0) return issue;
      if (positions.length === 1) return { ...issue, occurrence: 0 };

      let occurrence = 0;
      if (changedSpans) {
        const used = claimed.get(issue.texte_original) ?? new Set<number>();
        const length = issue.texte_original.length;
        const candidate = positions.findIndex((start, nth) => {
          if (used.has(nth)) return false;
          const end = start + length;
          return changedSpans.some(span =>
            span.start === span.end
              ? start < span.start && span.start < end
              : start < span.end && span.start < end,
          );
        });
        if (candidate !== -1) {
          occurrence = candidate;
          used.add(candidate);
          claimed.set(issue.texte_original, used);
        }
      }
      return { ...issue, occurrence };
    });
  }

  /**
   * Traite la réponse brute de Mistral : attribue des UUIDs, réduit les
   * corrections trop larges au minimum de mots, filtre les fausses erreurs
   * purement typographiques (apostrophes/tirets) et localise l'occurrence
   * fautive de chaque erreur dans le texte vérifié.
   * @param response La réponse du modèle
   * @param checkedText Le texte exact qui a été soumis à la vérification
   */
  static processResponse(
    response: CorrectionResponse | null | undefined,
    checkedText: string,
  ): CorrectionIssue[] {
    if (!response || !Array.isArray(response.erreurs)) return [];

    const withIds: CorrectionIssue[] = response.erreurs.map(issue => ({
      ...issue,
      id: issue.id || crypto.randomUUID(),
    }));

    const trimmed = withIds.flatMap(issue =>
      this.trimIssueToMinimalUnits(issue, checkedText),
    );

    const filtered = trimmed.filter(
      issue => issue.texte_original && !this.isTypographyOnlyIssue(issue),
    );

    return this.assignOccurrences(filtered, checkedText, response.texte_corrige_complet);
  }
}
