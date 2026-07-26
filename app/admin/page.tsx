import { ModelSettingsStore } from '@/services/ModelSettingsStore';
import { AdminModelForm } from '@/components/ui/AdminModelForm';
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

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Administration</h1>
      <p className={styles.subtitle}>
        Choix du fournisseur et du modèle IA pour chaque fonctionnalité. Les
        changements s&apos;appliquent immédiatement, sans redéploiement.
      </p>
      {memoryOnly && (
        <p className={styles.warning}>
          ⚠️ Le disque est en lecture seule : les réglages resteront actifs
          jusqu&apos;au prochain redémarrage du serveur uniquement.
        </p>
      )}
      <AdminModelForm initialSettings={settings} />
    </div>
  );
}
