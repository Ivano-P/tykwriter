import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import styles from './notes.module.css';

export default async function NotesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect('/connexion');
  }

  const t = await getTranslations('notes');

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.comingSoon}>{t('comingSoon')}</p>
    </div>
  );
}
