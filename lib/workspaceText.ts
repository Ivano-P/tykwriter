/**
 * Texte de travail partagé entre les modes d'écriture : clé de stockage et
 * copie presse-papiers. Module commun à TextContext (persistance), à la Navbar
 * et au sélecteur de mode de la zone de saisie.
 */

/** Clé sessionStorage du texte de travail (voir lib/TextContext.tsx). */
export const WORKSPACE_TEXT_KEY = 'tykwriter:workspace-text';

/** Événement émis après une copie réussie (la Navbar affiche la confirmation). */
export const TEXT_COPIED_EVENT = 'tykwriter:text-copied';

export function readWorkspaceText(): string {
  try {
    return sessionStorage.getItem(WORKSPACE_TEXT_KEY) ?? '';
  } catch {
    return '';
  }
}

/** Repli synchrone quand l'API asynchrone est refusée (contexte non sécurisé,
 *  Safari, permission bloquée). */
function fallbackCopy(text: string): boolean {
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Copie le texte de travail dans le presse-papiers (double sécurité au passage
 * vers les notes). À appeler DANS un geste utilisateur : les navigateurs
 * refusent l'écriture presse-papiers en dehors.
 */
export function copyWorkspaceText(): void {
  const text = readWorkspaceText();
  if (!text.trim()) return;

  const notify = () => {
    document.dispatchEvent(new CustomEvent(TEXT_COPIED_EVENT));
  };

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(notify, () => {
      if (fallbackCopy(text)) notify();
    });
    return;
  }
  if (fallbackCopy(text)) notify();
}
