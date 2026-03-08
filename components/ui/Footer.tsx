import Link from 'next/link';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <p className={styles.slogan}>Le complice de votre génie, le gardien de vos textes.</p>
        <div className={styles.links}>
          <Link href="/legal" className={styles.link}>Mentions légales</Link>
          <span className={styles.separator}>|</span>
          <Link href="/privacy" className={styles.link}>Confidentialité</Link>
          <span className={styles.separator}>|</span>
          <Link href="/terms" className={styles.link}>CGU</Link>
        </div>
      </div>
    </footer>
  );
}
