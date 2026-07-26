import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { NoteService } from '@/services/NoteService';
import { NotesWorkspace } from './NotesWorkspace';

export default async function NotesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect('/connexion');
  }

  const { folders, notes } = await NoteService.listForUser(session.user.id);

  return <NotesWorkspace initialFolders={folders} initialNotes={notes} />;
}
