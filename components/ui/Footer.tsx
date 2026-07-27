import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import styles from './Footer.module.css';

export async function Footer() {
  const t = await getTranslations('footer');

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>

        {/* Left: Logo */}
        <div className={styles.logoWrapper}>
          <Link href="/">
            <Image
              src="/images/tykwriter_logo.png"
              alt="Tykwriter Logo"
              width={110}
              height={30}
              className={styles.logo}
            />
          </Link>
        </div>

        {/* Center: Slogan + Legal links */}
        <div className={styles.center}>
          <p className={styles.slogan}>{t('slogan')}</p>
          <div className={styles.links}>
            <Link href="/legal" className={styles.link}>{t('legal')}</Link>
            <span className={styles.separator}>|</span>
            <Link href="/privacy" className={styles.link}>{t('privacy')}</Link>
            <span className={styles.separator}>|</span>
            <Link href="/terms" className={styles.link}>{t('terms')}</Link>
          </div>
        </div>

        {/* Right: Language switcher + theme toggle */}
        <div className={styles.langWrapper}>
          <LanguageSwitcher className={styles.languageSwitcher} />
          <ThemeToggle />
        </div>

      </div>
    </footer>
  );
}
