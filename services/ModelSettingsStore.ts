import { promises as fs } from 'fs';
import path from 'path';
import {
  DEFAULT_MODEL_SETTINGS,
  sanitizeModelSettings,
  type ModelSettings,
  type AiRole,
  type RoleModelChoice,
} from './modelCatalog';

/**
 * Persistance des réglages de modèles choisis depuis l'admin.
 * Fichier JSON sur disque + cache mémoire du process : la lecture ne touche
 * le disque qu'une fois, l'écriture est « write-through » (le cache reste la
 * source de vérité même si le disque est en lecture seule — dans ce cas les
 * réglages ne survivent pas à un redémarrage, ce que l'admin signale).
 */

const SETTINGS_PATH =
  process.env.MODEL_SETTINGS_PATH || path.join(process.cwd(), 'data', 'model-settings.json');

let cache: ModelSettings | null = null;
/** true si la dernière écriture disque a échoué (réglages en mémoire seulement). */
let lastWriteFailed = false;

export class ModelSettingsStore {
  static async getSettings(): Promise<ModelSettings> {
    if (cache) return cache;
    try {
      const raw = await fs.readFile(SETTINGS_PATH, 'utf-8');
      cache = sanitizeModelSettings(JSON.parse(raw));
    } catch {
      // Fichier absent ou illisible : défauts du code.
      cache = { ...DEFAULT_MODEL_SETTINGS };
    }
    return cache;
  }

  static async getRoleModel(role: AiRole): Promise<RoleModelChoice> {
    const settings = await this.getSettings();
    return settings[role];
  }

  /** Retourne true si la persistance disque a réussi. */
  static async saveSettings(input: unknown): Promise<boolean> {
    const settings = sanitizeModelSettings(input);
    cache = settings;
    try {
      await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
      await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
      lastWriteFailed = false;
    } catch (error) {
      console.error('ModelSettingsStore: disk write failed, settings kept in memory only.', error);
      lastWriteFailed = true;
    }
    return !lastWriteFailed;
  }

  static get isMemoryOnly(): boolean {
    return lastWriteFailed;
  }
}
