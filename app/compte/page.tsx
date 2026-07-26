import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AccountPanel } from './AccountPanel';

export default async function ComptePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect('/connexion');
  }

  return <AccountPanel name={session.user.name} email={session.user.email} />;
}
