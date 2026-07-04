/**
 * Prompt système de la passe de "Vérification finale" de l'assistant rédacteur.
 *
 * La correction phrase par phrase (assistantRedacteur.prompt.ts) travaille sans
 * contexte global : une correction appliquée sur une phrase isolée peut se
 * révéler erronée une fois le texte complet connu. Cette passe finale relit le
 * texte ENTIER, réexamine les corrections déjà appliquées et ne révise que ce
 * qui est incohérent dans le contexte global. Même contrat de sortie JSON
 * { "texte_corrige": string } que la passe phrase par phrase.
 */

import {
  buildAssistantRedacteurPrompt,
  ASSISTANT_REDACTEUR_JSON_SCHEMA,
  type AssistantOptions,
} from './assistantRedacteur.prompt';

/** Correction inline déjà appliquée pendant la saisie (texte du chunk avant/après). */
export interface AppliedCorrection {
  original: string;
  corrected: string;
}

/** Nombre maximal de corrections transmises à la passe finale. */
export const MAX_APPLIED_CORRECTIONS = 30;

/** Longueur maximale acceptée pour chaque texte de correction (garde-fou API). */
const MAX_CORRECTION_TEXT_LENGTH = 2500;

/**
 * Valide une liste de corrections d'origine externe (body JSON).
 * Toute entrée invalide est ignorée ; seules les MAX_APPLIED_CORRECTIONS
 * dernières entrées valides sont conservées.
 */
export function sanitizeAppliedCorrections(input: unknown): AppliedCorrection[] {
  if (!Array.isArray(input)) return [];

  const valid: AppliedCorrection[] = [];
  for (const entry of input) {
    if (!entry || typeof entry !== 'object') continue;
    const { original, corrected } = entry as Record<string, unknown>;
    if (
      typeof original === 'string' && original.length <= MAX_CORRECTION_TEXT_LENGTH &&
      typeof corrected === 'string' && corrected.length <= MAX_CORRECTION_TEXT_LENGTH
    ) {
      valid.push({ original, corrected });
    }
  }
  return valid.slice(-MAX_APPLIED_CORRECTIONS);
}

/* ------------------------------------------------------------------ */
/* Segments du prompt système                                          */
/* ------------------------------------------------------------------ */

const FINAL_INTRO = `Tu es le relecteur FINAL de Tykwriter, expert en correction orthographique, grammaticale et typographique du FRANÇAIS et de l'ANGLAIS. Le texte que l'utilisateur soumet est un texte COMPLET qui a déjà été corrigé phrase par phrase, au fil de la frappe, SANS contexte global : chaque phrase a été corrigée isolément, sans connaître les phrases suivantes. Ton unique rôle est d'effectuer une passe de relecture finale sur le texte ENTIER pour en vérifier la cohérence d'ensemble.`;

const FINAL_RULES = `DIRECTIVES DE LA PASSE FINALE :

	A. COHÉRENCE GLOBALE : Relis le texte intégral et vérifie que chaque phrase reste correcte et cohérente maintenant que le contexte complet est connu (homophones, accords à distance, reprises pronominales, enchaînements logiques entre les phrases).

	B. RÉVISION DES CORRECTIONS ANTÉRIEURES : La liste ci-dessus recense les corrections déjà appliquées phrase par phrase. Vérifie que CHACUNE a encore du sens dans le contexte complet du texte. Si une correction s'avère erronée ou maladroite DANS CE CONTEXTE, révise-la en choisissant la formulation la plus proche possible du choix de mots et de l'intention de l'auteur. Ne réécris JAMAIS une phrase pour la rendre "plus élégante".

	C. TEXTE INCHANGÉ PAR DÉFAUT : Si tout est cohérent, retourne le texte EXACTEMENT INCHANGÉ dans "texte_corrige". Dans le doute, ne change rien.

	D. RÈGLES INVARIANTES : Toutes les directives de correction ci-dessous (style et registre selon le ton choisi, abréviations, typographie, anti-instruction, aucun Markdown ajouté, équivalence stricte des apostrophes et des tirets, préservation des balises [code] et des liens, textes français et anglais corrigés chacun selon les règles de leur propre langue, toute AUTRE langue retournée telle quelle sans traduction, aucun filtre moral) s'appliquent intégralement à cette passe finale.

	E. FORMAT DE SORTIE : Retourne EXCLUSIVEMENT l'objet JSON {"texte_corrige": "..."} contenant le texte intégral (inchangé ou révisé). AUCUN texte avant ou après le JSON.`;

const INVARIANT_RULES_NOTE = `NOTE : Les règles et exemples ci-dessous sont ceux de la passe phrase par phrase ; ils définissent les corrections autorisées. Dans cette passe finale, ils s'appliquent UNIQUEMENT lorsque tu dois réviser quelque chose : le comportement par défaut reste de retourner le texte inchangé (directive C).`;

/**
 * Construit le prompt système de la passe finale.
 * Les directives invariantes de la passe phrase par phrase sont intégrées
 * telles quelles (via buildAssistantRedacteurPrompt) afin de garantir
 * l'alignement des deux passes sur les mêmes règles (ton, abréviations, etc.).
 */
export function buildFinalCheckPrompt(
  options: AssistantOptions,
  appliedCorrections: AppliedCorrection[]
): string {
  const correctionsList = appliedCorrections.length > 0
    ? appliedCorrections
      .map(({ original, corrected }) => `	« ${original.trim()} » → « ${corrected.trim()} »`)
      .join('\n')
    : '	(aucune correction appliquée pendant la saisie)';

  return [
    FINAL_INTRO,
    `CORRECTIONS DÉJÀ APPLIQUÉES PHRASE PAR PHRASE (« texte original » → « texte corrigé ») :\n\n${correctionsList}`,
    FINAL_RULES,
    INVARIANT_RULES_NOTE,
    `RÈGLES DE CORRECTION INVARIANTES (identiques à la passe phrase par phrase) :\n\n${buildAssistantRedacteurPrompt(options)}`,
  ].join('\n\n');
}

/**
 * Schéma JSON strict pour le mode `json_schema` de Mistral.
 * Même contrat que la passe phrase par phrase.
 */
export const FINAL_CHECK_JSON_SCHEMA = ASSISTANT_REDACTEUR_JSON_SCHEMA;
