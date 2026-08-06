'use client';

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

/** Clé de stockage du texte de travail partagé entre les modes d'écriture. */
export const WORKSPACE_TEXT_KEY = 'tykwriter:workspace-text';

/**
 * Store externe minimal adossé à sessionStorage.
 * `/notes` est hors du groupe (workspace) : y naviguer démonte ce provider et
 * ferait perdre le texte en cours. On le persiste donc le temps de l'onglet,
 * ce qui permet d'aller prendre une note puis de revenir avec son texte.
 * useSyncExternalStore (plutôt qu'un useState + effet) évite à la fois le
 * setState-dans-un-effet et les écarts d'hydratation.
 */
const listeners = new Set<() => void>();
/** Cache indispensable : getSnapshot doit renvoyer une valeur stable. */
let cached: string | null = null;

function readText(): string {
  if (cached === null) {
    try {
      cached = sessionStorage.getItem(WORKSPACE_TEXT_KEY) ?? '';
    } catch {
      cached = '';
    }
  }
  return cached;
}

function writeText(text: string): void {
  cached = text;
  try {
    sessionStorage.setItem(WORKSPACE_TEXT_KEY, text);
  } catch {
    // Navigation privée ou quota atteint : le texte reste au moins en mémoire.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Rendu serveur : pas de sessionStorage, on démarre sur un texte vide. */
function serverSnapshot(): string {
  return '';
}

interface TextContextType {
  globalText: string;
  setGlobalText: (text: string) => void;
}

const TextContext = createContext<TextContextType | undefined>(undefined);

export function TextProvider({ children }: { children: ReactNode }) {
  const globalText = useSyncExternalStore(subscribe, readText, serverSnapshot);
  const setGlobalText = useCallback((text: string) => writeText(text), []);

  return (
    <TextContext.Provider value={{ globalText, setGlobalText }}>
      {children}
    </TextContext.Provider>
  );
}

export function useText() {
  const ctx = useContext(TextContext);
  if (!ctx) throw new Error('useText must be used within TextProvider');
  return ctx;
}
