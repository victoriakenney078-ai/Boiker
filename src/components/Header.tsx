import { useI18n } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import styles from './Header.module.css';

interface Props {
  projectName: string;
  search?: string;
  onSearchChange?: (v: string) => void;
  onAddTask?: () => void;
  onBackToLanding?: () => void;
  onBackToBoards?: () => void;
  onSignOut?: () => void;
}

export function Header({
  projectName,
  search,
  onSearchChange,
  onAddTask,
  onBackToLanding,
  onBackToBoards,
  onSignOut,
}: Props) {
  const { t } = useI18n();

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        {onBackToBoards || onBackToLanding ? (
          <div className={styles.backs}>
            {onBackToBoards ? (
              <button type="button" className={styles.back} onClick={onBackToBoards}>
                {t('header.backToBoards')}
              </button>
            ) : null}
            {onBackToLanding ? (
              <button type="button" className={styles.back} onClick={onBackToLanding}>
                {t('header.back')}
              </button>
            ) : null}
          </div>
        ) : null}
        <span className={styles.logo}>AivibeBoard</span>
        <span className={styles.project}>{projectName}</span>
      </div>
      <div className={styles.actions}>
        <LanguageSwitcher variant="app" />
        {onSearchChange ? (
          <input
            type="search"
            className={styles.search}
            placeholder={t('header.search')}
            value={search ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label={t('header.search')}
          />
        ) : null}
        {onAddTask ? (
          <button type="button" className={styles.primary} onClick={onAddTask}>
            {t('header.addTask')}
          </button>
        ) : null}
        {onSignOut ? (
          <button type="button" className={styles.signOut} onClick={onSignOut}>
            {t('header.signOut')}
          </button>
        ) : null}
      </div>
    </header>
  );
}
