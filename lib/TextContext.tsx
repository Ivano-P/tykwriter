'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface TextContextType {
  globalText: string;
  setGlobalText: (text: string) => void;
}

const TextContext = createContext<TextContextType | undefined>(undefined);

export function TextProvider({ children }: { children: ReactNode }) {
  const [globalText, setGlobalText] = useState('');
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
