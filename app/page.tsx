import { Workspace } from '@/components/ui/Workspace';
import styles from './page.module.css';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function Home(props: Props) {
  const searchParams = await props.searchParams;
  const modeParam = searchParams.mode;
  const validModes = ["correcteur", "assistant-redacteur", "traduction"];
  const mode = validModes.includes(modeParam as string) ? modeParam as any : "correcteur";

  return (
    <div className={styles.pageContainer}>
      <Workspace initialMode={mode} />
    </div>
  );
}
