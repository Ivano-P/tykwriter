'use client';

import styles from './CorrectionSidebar.module.css'; // Réutilise le CSS principal de la sidebar

export function TraductionSidebar() {
  return (
    <aside className={styles.sidebarContainer}>
      <h2 className={styles.title}>Actions</h2>
      <div className={styles.separator} />

      <div className={styles.actionSection} style={{ textAlign: 'center', opacity: 0.6, marginTop: '2rem' }}>
        <p>Bientôt disponible</p>
      </div>
    </aside>
  );
}
