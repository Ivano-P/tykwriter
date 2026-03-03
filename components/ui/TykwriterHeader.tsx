import Image from 'next/image';
import styles from './TykwriterHeader.module.css';

export function TykwriterHeader() {
  return (
    <header className={styles.headerContainer}>
      <Image
        src="/images/tykwriter_logo.png"
        alt="Tykwriter Logo"
        width={300}
        height={80}
        className={styles.logoImage}
        priority
      />
    </header>
  );
}
