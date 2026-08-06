'use client';

import Link from 'next/link';
import { Bug } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSession } from '@/lib/auth-client';
import styles from './ReportBugLink.module.css';

/**
 * Lien discret « Signaler un bug » en bas des barres d'actions des modes
 * d'écriture. Masqué pour les visiteurs non connectés : /signalements exige
 * un compte (les signalements sont rattachés à leur auteur).
 */
export function ReportBugLink() {
  const t = useTranslations('reports');
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <Link href="/signalements" className={styles.link} title={t('linkTitle')}>
      <Bug size={14} />
      <span>{t('linkLabel')}</span>
    </Link>
  );
}
