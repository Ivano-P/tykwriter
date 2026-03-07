import styles from '@/components/ui/StaticPage.module.css';

export default function LegalPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Mentions Légales</h1>

      <div className={styles.content}>
        <h2>1. Éditeur du site</h2>
        <p>Le site Tykwriter est édité par TYKDEV.</p>
        <p>Email de contact : <strong>contact@tykdev.com</strong></p>

        <h2>2. Hébergement & Nom de domaine</h2>
        <p>Hostinger International Ltd</p>
        <p>61 Lordou Vironos Street</p>
        <p>6023 Larnaca, Cyprus</p>

        <h2>3. Propriété Intellectuelle</h2>
        <p>
          L'ensemble de ce site relève de la législation française et
          internationale sur le droit d'auteur et la propriété intellectuelle.
          Toute reproduction est formellement interdite sauf autorisation expresse.
        </p>
      </div>
    </div>
  );
}
