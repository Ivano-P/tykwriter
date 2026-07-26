import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AuthForm } from './AuthForm';

export default async function ConnexionPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect('/notes');
  }

  return <AuthForm />;
}
