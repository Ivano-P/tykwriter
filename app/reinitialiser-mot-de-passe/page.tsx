import { ResetPasswordForm } from './ResetPasswordForm';

interface Props {
  searchParams: Promise<{ token?: string; error?: string }>;
}

export default async function ReinitialiserMotDePassePage({ searchParams }: Props) {
  const { token, error } = await searchParams;

  return <ResetPasswordForm token={token ?? null} tokenError={Boolean(error)} />;
}
