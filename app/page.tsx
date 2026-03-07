import { Workspace } from '@/components/ui/Workspace';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.pageContainer}>
      <main className={styles.mainLayout}>
        <Workspace />
      </main>
    </div>
  );
}
