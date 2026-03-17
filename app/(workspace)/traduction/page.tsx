'use client';

import { TraductionSidebar } from '@/components/ui/TraductionSidebar';
import { useText } from '@/lib/TextContext';
import layoutStyles from '../layout.module.css';

export default function TraductionPage() {
  const { globalText } = useText();

  return (
    <>
      <div className={layoutStyles.headerBanner}>
        <h1 className={layoutStyles.headerTitle}>
          Votre Assistant de Rédaction et Correcteur de Précision.
        </h1>
        <p className={layoutStyles.headerSubtitle}>
          Traduisez vos textes avec une précision absolue et un ton naturel grâce à une compréhension profonde de votre contexte.
        </p>
      </div>

      <div className={layoutStyles.workspaceContent}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', minHeight: '400px', fontSize: '1.125rem', fontWeight: 500 }}>
            Mode traduction (Bientôt disponible)
          </div>
        </div>

        <TraductionSidebar />
      </div>
    </>
  );
}
