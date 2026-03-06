'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import styles from './ModeSidebar.module.css';

export function ModeSidebar() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [animatingBtn, setAnimatingBtn] = useState<string | null>(null);

  const handleSoonClick = (btnId: string) => {
    setAnimatingBtn(btnId);
    setToastMessage("Cette fonctionnalité n'est pas encore disponible.");
    setTimeout(() => setAnimatingBtn(null), 400); // correspond à la durée de l'animation
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <aside className={styles.sidebarContainer}>
      <h2 className={styles.title}>Mode</h2>
      <div className={styles.separator} />
      <div className={styles.buttonContainer}>
        <Button
          className={styles.buttonCorrecteur}
        >
          correcteur
        </Button>
        <Button
          onClick={() => handleSoonClick('trad')}
          className={`${styles.buttonSoon} ${animatingBtn === 'trad' ? styles.shake : ''}`}
        >
          traduction
        </Button>
        <Button
          onClick={() => handleSoonClick('maitre')}
          className={`${styles.buttonSoon} ${animatingBtn === 'maitre' ? styles.shake : ''}`}
        >
          maitre rédacteur
        </Button>
      </div>
      {toastMessage && (
        <div className={styles.toastMessage}>
          {toastMessage}
        </div>
      )}
    </aside>
  );
}
