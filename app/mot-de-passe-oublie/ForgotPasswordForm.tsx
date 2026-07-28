'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { authClient } from '@/lib/auth-client';
import styles from '../connexion/connexion.module.css';

/**
 * Demande de réinitialisation : envoie l'email avec le lien.
 * Toujours le même message de succès, que l'adresse existe ou non
 * (pas d'énumération de comptes).
 */
export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: '/reinitialiser-mot-de-passe',
    });
    setState(error ? 'error' : 'sent');
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t('forgotTitle')}</h1>

        {state === 'sent' ? (
          <p className={styles.switchRow}>{t('forgotSent')}</p>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <p className={styles.switchRow}>{t('forgotIntro')}</p>
            <label className={styles.field}>
              <span className={styles.label}>{t('email')}</span>
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>

            {state === 'error' && (
              <p className={styles.error}>{t('errorGeneric')}</p>
            )}

            <button
              className={styles.submit}
              type="submit"
              disabled={state === 'sending'}
            >
              {state === 'sending' ? t('loading') : t('forgotSubmit')}
            </button>
          </form>
        )}

        <p className={styles.switchRow}>
          <Link href="/connexion" className={styles.switchButton}>
            {t('backToSignIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
