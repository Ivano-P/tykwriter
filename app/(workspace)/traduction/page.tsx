'use client';

import { useTranslations } from 'next-intl';
import { TraductionSidebar } from '@/components/ui/TraductionSidebar';
import { useText } from '@/lib/TextContext';
import layoutStyles from '../layout.module.css';

export default function TraductionPage() {
  const t = useTranslations('banner');
  const tPage = useTranslations('traductionPage');
  const { globalText } = useText();

  return (
    <>
      <div className={layoutStyles.headerBanner}>
        <h1 className={layoutStyles.headerTitle}>
          {t('title')}
        </h1>
        <p className={layoutStyles.headerSubtitle}>
          {t('traductionSubtitle')}
        </p>
      </div>

      <div className={layoutStyles.workspaceContent}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', minHeight: '400px', fontSize: '1.125rem', fontWeight: 500 }}>
            {tPage('comingSoon')}
          </div>
        </div>

        <TraductionSidebar />
      </div>
    </>
  );
}
