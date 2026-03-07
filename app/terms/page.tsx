import styles from '@/components/ui/StaticPage.module.css';

export default function TermsPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Conditions Générales d'Utilisation (CGU)</h1>

      <div className={styles.content}>
        <h2>1. Objet</h2>
        <p>
          L'application a pour but de vous accompagner dans vos rédactions à
          travers la correction orthographique, la reformulation, et la gestion du style.
        </p>

        <h2>2. Responsabilité</h2>
        <p>
          Bien que nous nous efforcions de proposer un service optimal, l'utilisateur
          est seul responsable de l'utilisation du contenu généré par l'application.
        </p>

        <h2>3. Compte utilisateur</h2>
        <p>
          Vous êtes responsable de la confidentialité de vos identifiants. Toute
          activité sur votre compte est réputée être de votre fait.
        </p>

        <h2>4. Modifications</h2>
        <p>
          Nous nous réservons le droit de modifier ces conditions. L'utilisation
          continue vaut acceptation.
        </p>

        <h2>5. Contact</h2>
        <p>TYKDEV (contact@tykdev.com)</p>
      </div>
    </div>
  );
}
