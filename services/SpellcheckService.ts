import { CorrectionIssue } from './MistralAiProService';

export class SpellcheckService {
  /**
   * Applique une seule correction sur le texte donné.
   * @param text Le texte complet
   * @param issue L'erreur à corriger
   * @returns Le nouveau texte
   */
  static applyCorrectionText(text: string, issue: CorrectionIssue): string {
    return text.replace(issue.texte_original, issue.correction);
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
      newText = newText.replace(issue.texte_original, issue.correction);
    });
    return newText;
  }

  /**
   * Traite la réponse brute de Mistral et retourne un tableau validé d'erreurs.
   */
  static processResponse(response: any): CorrectionIssue[] {
     if (response && response.erreurs && Array.isArray(response.erreurs)) {
       return response.erreurs;
     }
     return [];
  }
}
