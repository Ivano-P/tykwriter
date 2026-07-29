'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signIn, signUp } from '@/lib/auth-client';
import styles from './connexion.module.css';

type Mode = 'signin' | 'signup';

export function AuthForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const errorKeyFromCode = (code?: string): string => {
    switch (code) {
      case 'USER_ALREADY_EXISTS':
        return 'errorEmailExists';
      case 'INVALID_EMAIL_OR_PASSWORD':
        return 'errorInvalidCredentials';
      case 'PASSWORD_TOO_SHORT':
        return 'errorPasswordTooShort';
      default:
        return 'errorGeneric';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErrorKey(null);
    if (mode === 'signup' && password !== confirmPassword) {
      setErrorKey('errorPasswordMismatch');
      return;
    }
    setLoading(true);

    const result =
      mode === 'signin'
        ? await signIn.email({ email, password })
        : await signUp.email({ name, email, password });

    if (result.error) {
      setErrorKey(errorKeyFromCode(result.error.code));
      setLoading(false);
      return;
    }

    // refresh() pour que la Navbar (server layout) voie la session.
    router.push('/notes');
    router.refresh();
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setConfirmPassword('');
    setErrorKey(null);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>
          {mode === 'signin' ? t('signInTitle') : t('signUpTitle')}
        </h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label className={styles.field}>
              <span className={styles.label}>{t('name')}</span>
              <input
                className={styles.input}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </label>
          )}

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

          <label className={styles.field}>
            <span className={styles.label}>{t('password')}</span>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </label>

          {mode === 'signup' && (
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
          )}

          {errorKey && <p className={styles.error}>{t(errorKey)}</p>}

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading
              ? t('loading')
              : mode === 'signin'
                ? t('signInButton')
                : t('signUpButton')}
          </button>
        </form>

        <p className={styles.switchRow}>
          {mode === 'signin' ? t('noAccount') : t('haveAccount')}{' '}
          <button className={styles.switchButton} type="button" onClick={switchMode}>
            {mode === 'signin' ? t('switchToSignUp') : t('switchToSignIn')}
          </button>
        </p>
      </div>
    </div>
  );
}
