'use client';

import { TextProvider } from '@/lib/TextContext';
import styles from './layout.module.css';

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TextProvider>
      <div className={styles.workspaceContainer}>
        {children}
      </div>
    </TextProvider>
  );
}
