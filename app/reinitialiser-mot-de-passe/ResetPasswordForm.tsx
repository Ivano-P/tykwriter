'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { authClient } from '@/lib/auth-client';
import styles from '../connexion/connexion.module.css';

interface Props {
  token: string | null;
  /** Lien expiré ou invalide (paramètre ?error= renvoyé par Better Auth). */
  tokenError: boolean;
}

/** Choix du nouveau mot de passe depuis le lien reçu par email. */
export function ResetPasswordForm({ token, tokenError }: Props) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'saving' | 'done'>('idle');

  const invalidLink = tokenError || !token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'saving' || !token) return;
    setErrorKey(null);
    if (password !== confirmPassword) {
      setErrorKey('errorPasswordMismatch');
      return;
    }
    setState('saving');
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    if (error) {
      setState('idle');
      setErrorKey(
        error.code === 'PASSWORD_TOO_SHORT'
          ? 'errorPasswordTooShort'
          : 'resetInvalidLink',
      );
      return;
    }
    setState('done');
    setTimeout(() => {
      router.push('/connexion');
    }, 2000);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t('resetTitle')}</h1>

        {invalidLink ? (
          <>
            <p className={styles.error}>{t('resetInvalidLink')}</p>
            <p className={styles.switchRow}>
              <Link href="/mot-de-passe-oublie" className={styles.switchButton}>
                {t('resetRequestAgain')}
              </Link>
            </p>
          </>
        ) : state === 'done' ? (
          <p className={styles.switchRow}>{t('resetDone')}</p>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span className={styles.label}>{t('newPassword')}</span>
              <input
                className={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>{t('confirmPassword')}</span>
              <input
                className={styles.input}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>

            {errorKey && <p className={styles.error}>{t(errorKey)}</p>}

            <button
              className={styles.submit}
              type="submit"
              disabled={state === 'saving'}
            >
              {state === 'saving' ? t('loading') : t('resetSubmit')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
