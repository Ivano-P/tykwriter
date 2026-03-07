import Link from 'next/link';
import styles from '@/components/ui/StaticPage.module.css';

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>À propos de nous</h1>
      <div className={styles.content}>
        <p>
          Je suis un développeur freelance particulièrement attaché au respect des
          données et de la vie privée. J'ai développé cet outil initialement pour
          mon usage personnel, et je souhaite aujourd'hui le partager avec les
          utilisateurs qui recherchent un correcteur performant et respectueux de
          ces mêmes principes.
        </p>
        <p>
          Tykwriter s'engage à ne jamais revendre vos informations et à ne
          demander que les données strictement nécessaires au service rendu et à
          l'amélioration de l'application.
        </p>
      </div>

      <div className={styles.links}>
        <Link href="/legal" className={styles.linkItem}>Mentions Légales</Link>
        <Link href="/privacy" className={styles.linkItem}>Confidentialité</Link>
        <Link href="/terms" className={styles.linkItem}>CGU</Link>
      </div>
    </div>
  );
}
