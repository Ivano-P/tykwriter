import { Workspace } from '@/components/ui/Workspace';
import styles from './page.module.css';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function Home(props: Props) {
  const searchParams = await props.searchParams;
  const modeParam = searchParams.mode;
  const validModes = ["correcteur", "maitre-redacteur", "traduction"];
  const mode = validModes.includes(modeParam as string) ? modeParam as any : "correcteur";

  return (
    <div className={styles.pageContainer}>
      <main className={styles.mainLayout}>
        <Workspace initialMode={mode} />
      </main>
    </div>
  );
}
