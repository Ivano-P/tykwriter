import { ModelSettingsStore } from '@/services/ModelSettingsStore';
import { ReportService } from '@/services/ReportService';
import { AdminModelForm } from '@/components/ui/AdminModelForm';
import { AdminReportsPanel } from '@/components/ui/AdminReportsPanel';
import styles from './admin.module.css';

/**
 * Page d'administration (protégée par Basic Auth via proxy.ts).
 * Vue serveur : lit les réglages courants et délègue l'édition au formulaire
 * client. Toujours dynamique — les réglages changent sans redéploiement.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tykwriter — Administration',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const settings = await ModelSettingsStore.getSettings();
  const memoryOnly = ModelSettingsStore.isMemoryOnly;
  // Signalements : la DB peut être indisponible (dev sans conteneur lancé) —
  // la page des réglages doit rester utilisable dans ce cas.
  const [reports, counts] = await Promise.all([
    ReportService.listAll().catch(() => []),
    ReportService.countsByStatus().catch(() => ({
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
    })),
  ]);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Administration</h1>
      <p className={styles.subtitle}>
        Choix du fournisseur et du modèle IA pour chaque fonctionnalité. Les
        changements s&apos;appliquent immédiatement, sans redéploiement nécessairte .
      </p>
      {memoryOnly && (
        <p className={styles.warning}>
          ⚠️ Le disque est en lecture seule : les réglages resteront actifs
          jusqu&apos;au prochain redémarrage du serveur uniquement.
        </p>
      )}
      <AdminModelForm initialSettings={settings} />

      <h2 className={styles.sectionTitle}>Signalements</h2>
      <p className={styles.subtitle}>
        Bugs, suggestions et questions envoyés par les utilisateurs depuis
        /signalements. La réponse enregistrée est visible par l&apos;auteur.
      </p>
      <AdminReportsPanel initialReports={reports} counts={counts} />
    </div>
  );
}
