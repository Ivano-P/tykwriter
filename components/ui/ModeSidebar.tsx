import { Button } from '@/components/ui/button';
import styles from './ModeSidebar.module.css';

export function ModeSidebar() {
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
          disabled
          className={styles.buttonTraduction}
        >
          traduction<br />bientôt disponible
        </Button>
      </div>
    </aside>
  );
}
