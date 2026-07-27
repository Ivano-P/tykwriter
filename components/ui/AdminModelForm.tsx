'use client';

import { useState, useTransition } from 'react';
import {
  AI_ROLES,
  MODEL_CATALOG,
  ROLE_LABELS,
  type AiProvider,
  type AiRole,
  type ModelSettings,
} from '@/services/modelCatalog';
import { saveModelSettingsAction } from '@/actions/admin.action';
import styles from './AdminModelForm.module.css';

const PROVIDER_LABELS: Record<AiProvider, string> = {
  mistral: 'Mistral AI',
  gemini: 'Google Gemini',
};

interface AdminModelFormProps {
  initialSettings: ModelSettings;
}

export function AdminModelForm({ initialSettings }: AdminModelFormProps) {
  const [settings, setSettings] = useState<ModelSettings>(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'saved' | 'memory' | 'error'>('idle');

  const setProvider = (role: AiRole, provider: AiProvider) => {
    setStatus('idle');
    setSettings((prev) => ({
      ...prev,
      // Changement de fournisseur → premier modèle du catalogue de ce fournisseur.
      [role]: { provider, model: MODEL_CATALOG[provider][0].id },
    }));
  };

  const setModel = (role: AiRole, model: string) => {
    setStatus('idle');
    setSettings((prev) => ({ ...prev, [role]: { ...prev[role], model } }));
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await saveModelSettingsAction(settings);
        if (!result.ok) {
          setStatus('error');
        } else {
          setStatus(result.persisted ? 'saved' : 'memory');
        }
      } catch {
        setStatus('error');
      }
    });
  };

  return (
    <div className={styles.form}>
      {AI_ROLES.map((role) => {
        const choice = settings[role];
        return (
          <fieldset key={role} className={styles.roleCard}>
            <legend className={styles.roleTitle}>{ROLE_LABELS[role]}</legend>
            <div className={styles.selectRow}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Fournisseur</span>
                <select
                  className={styles.select}
                  value={choice.provider}
                  onChange={(e) => setProvider(role, e.target.value as AiProvider)}
                  disabled={isPending}
                >
                  {(Object.keys(MODEL_CATALOG) as AiProvider[]).map((provider) => (
                    <option key={provider} value={provider}>
                      {PROVIDER_LABELS[provider]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Modèle ($ / 1M tokens, entrée → sortie)</span>
                <select
                  className={styles.select}
                  value={choice.model}
                  onChange={(e) => setModel(role, e.target.value)}
                  disabled={isPending}
                >
                  {MODEL_CATALOG[choice.provider].map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>
        );
      })}

      <div className={styles.actions}>
        <button className={styles.saveButton} onClick={handleSave} disabled={isPending}>
          {isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {status === 'saved' && <span className={styles.statusOk}>Réglages enregistrés.</span>}
        {status === 'memory' && (
          <span className={styles.statusWarn}>
            Actifs, mais non persistés (disque en lecture seule) : perdus au redémarrage.
          </span>
        )}
        {status === 'error' && (
          <span className={styles.statusError}>Échec de l&apos;enregistrement.</span>
        )}
      </div>
    </div>
  );
}
