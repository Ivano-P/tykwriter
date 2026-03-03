import { TykwriterHeader } from '@/components/ui/TykwriterHeader';
import { ModeSidebar } from '@/components/ui/ModeSidebar';
import { ContentArea } from '@/components/ui/ContentArea';
import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.pageContainer}>
      <TykwriterHeader />
      <main className={styles.mainLayout}>
        <ModeSidebar />
        <ContentArea />
      </main>
    </div>
  );
}
