/**
 * Types partagés des réponses IA. Module pur (aucune dépendance serveur) :
 * les composants client importent les types ici sans tirer les SDK ni fs.
 */

export interface CorrectionIssue {
  id: string;
  texte_original: string;
  correction: string;
  type: "orthographe" | "grammaire" | "typographie" | "style" | "ponctuation";
  explication: string;
  /** Index (base 0) de l'occurrence fautive de texte_original dans le texte vérifié. */
  occurrence?: number;
}

export interface CorrectionResponse {
  /** Code ISO 639-1 de la langue dominante détectée par le modèle. */
  langue_detectee?: string;
  texte_corrige_complet?: string;
  raisonnement_global?: string;
  erreurs: CorrectionIssue[];
}

/** Résultat d'une passe de correction invisible (assistant rédacteur). */
export interface AssistantCorrectionResult {
  texteCorrige: string;
  /** Code ISO 639-1 de la langue dominante détectée par le modèle. */
  langueDetectee?: string;
}
