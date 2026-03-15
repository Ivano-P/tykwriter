import styles from '@/components/ui/StaticPage.module.css';

export default function FeuilleDeRoutePage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Feuille de route</h1>
      <div className={styles.content}>
        <p>
          L'objectif de cet outil est de vous fournir un véritable compagnon de rédaction. 
          Écrivez avec passion, publiez avec précision : l'application apporte le cadre technique pour vous offrir une écriture fluide et sans les ratures. 
          Découvrez l'évolution de notre service.
        </p>

        <h2>Actuellement : Version 0.3 (Mise à jour majeure)</h2>
        <p>
          Cette version transforme radicalement l'expérience de saisie pour la rendre plus naturelle, rapide et adaptée aux professionnels.
        </p>
        <ul>
          <li><strong>Correction ciblée (Inline) :</strong> Le mode Correcteur permet désormais de visualiser et de corriger les fautes individuellement d'un simple clic directement dans le texte.</li>
          <li><strong>Frappe continue et non-bloquante :</strong> Dans le mode Assistant Rédacteur, la vérification se fait de manière transparente en arrière-plan. Votre saisie n'est plus jamais bloquée.</li>
          <li><strong>Performances standards :</strong> Le "Mode Boost" expérimental de la version précédente a fait ses preuves et devient le standard de vitesse par défaut pour tous les utilisateurs.</li>
          <li><strong>Ergonomie repensée :</strong> Le changement de mode (Correcteur / Assistant) se fait désormais directement et rapidement depuis la barre d'outils de la zone de saisie.</li>
          <li><strong>Intégration ServiceNow (SN) :</strong> Un mode spécial de gestion des liens. Ils restent beaux et lisibles dans l'éditeur, mais s'exportent automatiquement avec les balises de code HTML requises lors d'une copie.</li>
          <li><strong>Formatage E-mail instantané :</strong> Un nouveau bouton utilitaire permet d'ajouter automatiquement les formules de salutation et de politesse à votre texte.</li>
        </ul>

        <h2>Historique des versions</h2>
        <ul>
          <li>
            <strong>V0.2 :</strong> Refonte complète de l'interface pour la rendre totalement responsive sur tous les écrans. Introduction du "Mode Boost" expérimental.
          </li>
          <li>
            <strong>V0.1 :</strong> Lancement initial du projet. Correcteur orthographique et grammatical global avec un système de vérification manuelle et unique.
          </li>
        </ul>

        <h2>Prochaines étapes (À venir)</h2>
        <ul>
          <li>
            <strong>V0.4 (Le Traducteur) :</strong> Intégration d'un nouveau mode dédié à la traduction contextuelle pour transcender la barrière de la langue.
          </li>
          <li>
            <strong>Extension de navigateur :</strong> Le portage de notre outil sous forme d'extension pour vous accompagner sur tous vos sites web et webmails.
          </li>
        </ul>
      </div>
    </div>
  );
}