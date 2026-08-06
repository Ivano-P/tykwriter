import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ReportService } from '@/services/ReportService';
import { ReportsClient } from './ReportsClient';

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function SignalementsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect('/connexion');
  }

  const reports = await ReportService.listForUser(session.user.id);

  return <ReportsClient initialReports={reports} />;
}
