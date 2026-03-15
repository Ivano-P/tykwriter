import * as Diff from 'diff';

export class AutoCorrect {
  /**
   * Calcule les différences entre deux textes sous forme de tableau de mots avec leur état (ajouté/supprimé/inchangé).
   * @param originalText Le texte avant la correction
   * @param correctedText Le texte après la correction par l'Assistant Rédacteur
   * @returns Un tableau d'objets Diff représentant les changements
   */
  static calculateDiff(originalText: string, correctedText: string): Diff.Change[] {
    return Diff.diffWords(originalText, correctedText);
  }

   

  /**
   * Compare le texte original et corrigé, renvoie les modifications formatées.
   */
  static processCorrections(originalText: string, correctedText: string): { 
    hasChanges: boolean, 
    newText: string, 
    diffParts: Diff.Change[] | null 
  } {
    if (originalText === correctedText) {
      return { hasChanges: false, newText: originalText, diffParts: null };
    }

    const diffParts = this.calculateDiff(originalText, correctedText);
    return { hasChanges: true, newText: correctedText, diffParts };
  }
}
