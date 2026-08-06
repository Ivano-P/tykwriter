'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signIn, signUp } from '@/lib/auth-client';
import { authErrorKey, isExistingAccountError } from '@/lib/authErrors';
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
  /** L'email saisi a déjà un compte : on propose de basculer en connexion. */
  const [showSignInHint, setShowSignInHint] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErrorKey(null);
    setShowSignInHint(false);
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
      setErrorKey(authErrorKey(result.error.code));
      setShowSignInHint(isExistingAccountError(result.error.code));
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
    setShowSignInHint(false);
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

          {mode === 'signin' && (
            <p className={styles.forgotRow}>
              <Link href="/mot-de-passe-oublie" className={styles.switchButton}>
                {t('forgotLink')}
              </Link>
            </p>
          )}

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

          {showSignInHint && (
            <p className={styles.hintRow}>
              <button
                className={styles.switchButton}
                type="button"
                onClick={() => {
                  setMode('signin');
                  setConfirmPassword('');
                  setErrorKey(null);
                  setShowSignInHint(false);
                }}
              >
                {t('signInInstead')}
              </button>
            </p>
          )}

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
