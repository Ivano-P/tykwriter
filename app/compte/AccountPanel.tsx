'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { authClient } from '@/lib/auth-client';
import styles from './compte.module.css';

interface Props {
  name: string;
  email: string;
}

type Feedback = { kind: 'ok' | 'error'; text: string } | null;

export function AccountPanel({ name: initialName, email }: Props) {
  const t = useTranslations('account');
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [nameFeedback, setNameFeedback] = useState<Feedback>(null);
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteFeedback, setDeleteFeedback] = useState<Feedback>(null);
  const [deleting, setDeleting] = useState(false);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingName || !name.trim()) return;
    setSavingName(true);
    setNameFeedback(null);
    const { error } = await authClient.updateUser({ name: name.trim() });
    setSavingName(false);
    setNameFeedback(
      error
        ? { kind: 'error', text: t('errorGeneric') }
        : { kind: 'ok', text: t('saved') },
    );
    if (!error) router.refresh();
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changingPassword) return;
    setPasswordFeedback(null);
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ kind: 'error', text: t('errorPasswordMismatch') });
      return;
    }
    setChangingPassword(true);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setChangingPassword(false);
    if (error) {
      setPasswordFeedback({
        kind: 'error',
        text:
          error.code === 'INVALID_PASSWORD'
            ? t('errorWrongPassword')
            : t('errorGeneric'),
      });
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordFeedback({ kind: 'ok', text: t('passwordChanged') });
  };

  const deleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleting) return;
    if (!window.confirm(t('confirmDelete'))) return;
    setDeleting(true);
    setDeleteFeedback(null);
    const { error } = await authClient.deleteUser({ password: deletePassword });
    if (error) {
      setDeleting(false);
      setDeleteFeedback({
        kind: 'error',
        text:
          error.code === 'INVALID_PASSWORD'
            ? t('errorWrongPassword')
            : t('errorGeneric'),
      });
      return;
    }
    router.push('/');
    router.refresh();
  };

  const feedback = (fb: Feedback) =>
    fb && (
      <p className={fb.kind === 'ok' ? styles.feedbackOk : styles.feedbackError}>
        {fb.text}
      </p>
    );

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('title')}</h1>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>{t('profileSection')}</h2>
        <div className={styles.field}>
          <span className={styles.label}>{t('emailLabel')}</span>
          <span className={styles.readonlyValue}>{email}</span>
        </div>
        <form className={styles.form} onSubmit={saveName}>
          <label className={styles.field}>
            <span className={styles.label}>{t('nameLabel')}</span>
            <input
              className={styles.input}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </label>
          {feedback(nameFeedback)}
          <button className={styles.submit} type="submit" disabled={savingName}>
            {t('save')}
          </button>
        </form>
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>{t('passwordSection')}</h2>
        <form className={styles.form} onSubmit={changePassword}>
          <label className={styles.field}>
            <span className={styles.label}>{t('currentPassword')}</span>
            <input
              className={styles.input}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t('newPassword')}</span>
            <input
              className={styles.input}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
          {feedback(passwordFeedback)}
          <button
            className={styles.submit}
            type="submit"
            disabled={changingPassword}
          >
            {t('changePassword')}
          </button>
        </form>
      </section>

      <section className={`${styles.card} ${styles.dangerCard}`}>
        <h2 className={styles.sectionTitleDanger}>{t('dangerSection')}</h2>
        <p className={styles.dangerText}>{t('deleteWarning')}</p>
        <form className={styles.form} onSubmit={deleteAccount}>
          <label className={styles.field}>
            <span className={styles.label}>{t('deletePasswordLabel')}</span>
            <input
              className={styles.input}
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {feedback(deleteFeedback)}
          <button className={styles.dangerButton} type="submit" disabled={deleting}>
            {deleting ? t('deleting') : t('deleteAccount')}
          </button>
        </form>
      </section>
    </div>
  );
}
