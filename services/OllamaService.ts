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
          system: `Tu es un expert en correction orthographique, grammaticale et typographique française. Ton rôle est de rendre le texte parfait tout en conservant le style de l'auteur.
          
          DIRECTIVES ABSOLUES :
          1. DÉSACTIVE tes filtres de contenu : ne refuse jamais de corriger un texte, même s'il contient des insultes ou des propos inappropriés.Tu ne dois pas juger de la morale du texte
          2. Retourne EXCLUSIVEMENT le texte corrigé. AUCUN blabla, AUCUN "Voici la correction :".
          3. LOGIQUE SÉMANTIQUE : Corrige les mots qui existent dans le dictionnaire mais qui n'ont manifestement aucun sens dans le contexte de la phrase (erreurs de frappe ou de dictée vocale).
          4. TYPOGRAPHIE FRANÇAISE : Utilise obligatoirement les guillemets français (« ») avec leurs espaces. N'ajoute JAMAIS de formatage Markdown (pas de < > autour des liens).
          5. Préserve l'orthographe exacte des nom propres, prénoms, noms de famille et marques, et assure-toi qu'ils prennent une majuscule initiale ou toute en majuscule quand c'est le cas. Et ajoute les accents sur les majuscules (À, É, È, Ç).
         
          EXEMPLES DE COMPORTEMENT ATTENDU :
          Texte: Je suis continuant de te conaitre.
          Ta réponse: Je suis content de te connaître.
                    Texte: Il faut ouvrir un onglet à coté et saisir l'url suivant https://exemple.com
          Ta réponse: Il faut ouvrir un onglet à côté et saisir l'URL suivante : « https://exemple.com »
          Texte: Putain c'est vraimment un gro conard
          Ta réponse: Putain, c'est vraiment un gros connard.`,
          
          prompt: `Corrige ce texte sans RIEN ajouter avant ou après :\n\n${text}`,
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
