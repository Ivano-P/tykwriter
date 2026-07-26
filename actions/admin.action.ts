'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { ModelSettingsStore } from '@/services/ModelSettingsStore';
import { isValidAdminAuth } from '@/lib/adminAuth';

export interface SaveModelSettingsResult {
  ok: boolean;
  /** false si l'écriture disque a échoué (réglages actifs en mémoire seulement). */
  persisted: boolean;
  error?: string;
}

/**
 * Server Action acting as a Controller for the admin page.
 * MVC: Controller Layer — auth + validation, persistence in the Service.
 * Défense en profondeur : le proxy protège déjà /admin, mais une Server
 * Action reste invocable directement — on revalide l'en-tête Basic Auth.
 */
export async function saveModelSettingsAction(input: unknown): Promise<SaveModelSettingsResult> {
  const h = await headers();
  if (!isValidAdminAuth(h.get('authorization'))) {
    return { ok: false, persisted: false, error: 'Unauthorized.' };
  }

  // La validation détaillée (fournisseurs/modèles du catalogue) est faite par
  // sanitizeModelSettings dans le store : toute valeur inconnue retombe sur le défaut.
  const persisted = await ModelSettingsStore.saveSettings(input);
  revalidatePath('/admin');
  return { ok: true, persisted };
}
