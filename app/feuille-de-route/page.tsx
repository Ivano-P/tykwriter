import styles from '@/components/ui/StaticPage.module.css';

export default function FeuilleDeRoutePage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Feuille de route</h1>
      <div className={styles.content}>
        <p>
          L'objectif à terme est de vous fournir un outil complet pour vous
          accompagner dans votre rédaction.
        </p>

        <h2>Les étapes clés</h2>
        <ul>
          <li><strong>V1 :</strong> Correcteur intelligent.</li>
          <li><strong>V2 :</strong> Traducteur contextuel.</li>
          <li><strong>V3 :</strong> Maître rédacteur (permettant une saisie libre et rapide avec une correction et mise en forme automatiques).</li>
        </ul>

        <h2>À venir</h2>
        <ul>
          <li>Extension de navigateur pour vous accompagner partout sur le web.</li>
        </ul>
      </div>
    </div>
  );
}
