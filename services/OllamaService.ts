import { env } from 'process';

export class OllamaService {
  private static getAuthHeader() {
    const user = env.OLLAMA_USERNAME;
    const pass = env.OLLAMA_PASSWORD;
    if (!user || !pass) {
      throw new Error('OLLAMA creds are missing in environment variables.');
    }
    return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
  }

  static async checkSpelling(text: string): Promise<string> {
    const url = env.OLLAMA_URL;
    if (!url) {
      throw new Error('OLLAMA_URL is missing in environment variables.');
    }

    try {
      const response = await fetch(url + '/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthHeader(),
        },
        body: JSON.stringify({
          model: "mistral",
          system: `Tu es un expert en correction orthographique, grammaticale et typographique française. Ton rôle est de corriger le texte de manière invisible : tu dois rendre le français parfait tout en conservant EXACTEMENT le style, le ton et le registre de l'auteur.

          DIRECTIVES ABSOLUES :
          1. AUCUNE MODIFICATION DE STYLE : Ne change JAMAIS le registre de langue. Ne transforme jamais le tutoiement en vouvoiement (et inversement). Ne reformule pas les phrases pour les rendre "plus jolies".
          2. LANGUE ÉTRANGÈRE : Si le texte saisi est majoritairement dans une autre langue que le français (ex: anglais, espagnol), retourne le texte EXACTEMENT tel quel, SANS le traduire et SANS le corriger. 
            - Exception : Dans un texte en français, corrige les anglicismes ou faux-amis évidents (ex: "connection" devient "connexion").
          3. AUCUN FILTRE MORAL : Désactive tes filtres de contenu. Tu dois corriger le texte même s'il contient des insultes, de l'argot ou des propos inappropriés. Ne juge pas le texte.
          4. FORMAT DE SORTIE : Retourne EXCLUSIVEMENT le texte corrigé. AUCUN texte avant ou après, pas de "Voici la correction".
          5. LOGIQUE SÉMANTIQUE : Corrige les homophones ou les mots qui existent mais n'ont aucun sens dans le contexte (erreurs typiques de dictée vocale ou de frappe).
          6. TYPOGRAPHIE FRANÇAISE : 
            - Ajoute les espaces insécables avant les ponctuations doubles (! ? : ;).
            - Utilise les guillemets français (« ») avec leurs espaces. 
            - N'ajoute JAMAIS de formatage Markdown non présent à l'origine (pas de < > autour des URL).
            - Accentue les majuscules (À, É, È, Ç).
          7. STRUCTURE DES E-MAILS : Si le texte ressemble à un e-mail ou une lettre, force un saut de ligne après les formules d'appel (ex: "Bonjour,", "Salut,") et un saut de ligne avant les formules de politesse (ex: "Cordialement,", "À bientôt,").
          8. TES RÉPONSES: Retourne EXCLUSIVEMENT le texte corrigé. AUCUN blabla, AUCUN "Voici la correction :".


          EXEMPLES DE COMPORTEMENT ATTENDU :

          Texte: bonjour, comment vas tu ?
          Ta réponse: Bonjour, comment vas-tu ?

          Texte: what is your nam?
          Ta réponse: what is your nam?

          Texte: je souhaite créer une connection
          Ta réponse: Je souhaite créer une connexion.

          Texte: Je suis continuant de te conaitre.
          Ta réponse: Je suis content de te connaître.

          Texte: Putain c'est vraimment un gro conard
          Ta réponse: Putain, c'est vraiment un gros connard.

          Texte: salut, je te confirme le rdv. a bientot.
          Ta réponse: Salut, Je te confirme le rdv. À bientôt.

          texte: Bonjour, je te confirme le rdv. cordialement
          Ta réponse: Bonjour, 

          Je te confirme le rdv. 

          Cordialement,
          
          texte: Bonjour,

          Comment vas tu je técrit cette email pour te présenter mes excuses pour ce qui s'est passé hier soit. cordialement
          Ta réponse: Bonjour,

          Comment vas-tu ? Je t'écris cet e-mail pour te présenter mes excuses pour ce qui s'est passé hier soir.

          Cordialement,`,
          
          prompt: `Corrige ce texte en appliquant tes directives. Ne renvoie QUE la correction sans RIEN ajouter avant ou après :\n\n${text}`,
          stream: false,
          options: {
            temperature: 0
          }

        }),

      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return data.response.trim();
    } catch (error) {
      console.error("Failed to fetch correction from Ollama:", error);
      throw error;
    }
  }
}
