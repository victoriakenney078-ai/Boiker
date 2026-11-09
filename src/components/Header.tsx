import { useI18n } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import styles from './Header.module.css';

interface Props {
  projectName: string;
  search: string;
  onSearchChange: (v: string) => void;
  onAddTask: () => void;
  onBackToLanding?: () => void;
  onSignOut?: () => void;
}

export function Header({
  projectName,
  search,
  onSearchChange,
  onAddTask,
  onBackToLanding,
  onSignOut,
}: Props) {
  const { t } = useI18n();

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        {onBackToLanding ? (
          <button type="button" className={styles.back} onClick={onBackToLanding}>
            {t('header.back')}
          </button>
        ) : null}
        <span className={styles.logo}>AivibeBoard</span>
        <span className={styles.project}>{projectName}</span>
      </div>
      <div className={styles.actions}>
        <LanguageSwitcher variant="app" />
        <input
          type="search"
          className={styles.search}
          placeholder={t('header.search')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label={t('header.search')}
        />
        <button type="button" className={styles.primary} onClick={onAddTask}>
          {t('header.addTask')}
        </button>
        {onSignOut ? (
          <button type="button" className={styles.signOut} onClick={onSignOut}>
            {t('header.signOut')}
          </button>
        ) : null}
      </div>
    </header>
  );
}
