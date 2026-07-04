import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from './LanguageSwitcher';
import styles from './Footer.module.css';

export async function Footer() {
  const t = await getTranslations('footer');

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.row}>
          <p className={styles.slogan}>{t('slogan')}</p>
          <div className={styles.links}>
            <Link href="/legal" className={styles.link}>{t('legal')}</Link>
            <span className={styles.separator}>|</span>
            <Link href="/privacy" className={styles.link}>{t('privacy')}</Link>
            <span className={styles.separator}>|</span>
            <Link href="/terms" className={styles.link}>{t('terms')}</Link>
          </div>
        </div>
        <LanguageSwitcher className={styles.languageSwitcher} />
      </div>
    </footer>
  );
}
