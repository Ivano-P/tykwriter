import styles from '@/components/ui/StaticPage.module.css';

export default function PrivacyPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Politique de Confidentialité</h1>

      <div className={styles.content}>
        <p>
          La protection de vos données personnelles est une priorité pour nous.
          <br />
          Contact : <strong>contact@tykdev.com</strong>
        </p>

        <h2>1. Données collectées</h2>
        <ul>
          <li><strong>Identité :</strong> Prénom, Nom</li>
          <li><strong>Contact :</strong> Email</li>
          <li><strong>Authentification :</strong> Mot de passe stocké de manière chiffrée</li>
        </ul>

        <h2>2. Utilisation</h2>
        <p>
          Vos données servent uniquement à vous permettre d'accéder à votre espace
          personnel, d'utiliser l'assistant de rédaction, et de recevoir des emails
          transactionnels liés à votre compte.
        </p>

        <h2>3. Sous-traitants</h2>
        <ul>
          <li><strong>Hetzner :</strong> Hébergement de l'IA (Allemagne, conforme RGPD)</li>
          <li><strong>Hostinger :</strong> Hébergement web et emails</li>
        </ul>

        <h2>4. Cookies</h2>
        <p>
          Utilisation exclusive de cookies techniques strictement nécessaires
          (session via Better Auth). Aucun cookie publicitaire ou de traçage tiers.
        </p>

        <h2>5. Vos droits</h2>
        <p>
          Droit d'accès, de rectification et de suppression via l'espace "Mon Compte"
          ou par email.
        </p>

        <h2>6. Responsable du traitement</h2>
        <p>TYKDEV (contact@tykdev.com)</p>
      </div>
    </div>
  );
}
