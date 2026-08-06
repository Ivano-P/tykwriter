import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export default async function MotDePasseOubliePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect('/notes');
  }

  return <ForgotPasswordForm />;
}
