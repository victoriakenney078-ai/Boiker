import styles from './Header.module.css';

interface Props {
  projectName: string;
  search: string;
  onSearchChange: (v: string) => void;
  onAddTask: () => void;
  onBackToLanding?: () => void;
}

export function Header({
  projectName,
  search,
  onSearchChange,
  onAddTask,
  onBackToLanding,
}: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        {onBackToLanding ? (
          <button type="button" className={styles.back} onClick={onBackToLanding}>
            ← Сайт
          </button>
        ) : null}
        <span className={styles.logo}>AivibeBoard</span>
        <span className={styles.project}>{projectName}</span>
      </div>
      <div className={styles.actions}>
        <input
          type="search"
          className={styles.search}
          placeholder="Поиск по задачам…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Поиск по задачам"
        />
        <button type="button" className={styles.primary} onClick={onAddTask}>
          + Задача
        </button>
      </div>
    </header>
  );
}
