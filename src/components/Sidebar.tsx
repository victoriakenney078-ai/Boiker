import type { AppSection } from '../types';
import styles from './Sidebar.module.css';

const ITEMS: { id: AppSection; label: string }[] = [
  { id: 'board', label: 'Доска' },
  { id: 'knowledge', label: 'База знаний' },
  { id: 'ai', label: 'ИИ-постановка' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'team', label: 'Команда' },
  { id: 'settings', label: 'Настройки' },
];

interface Props {
  active: AppSection;
  onChange: (s: AppSection) => void;
  telegramUnread: number;
}

export function Sidebar({ active, onChange, telegramUnread }: Props) {
  return (
    <nav className={styles.sidebar} aria-label="Разделы">
      <ul className={styles.list}>
        {ITEMS.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={active === item.id ? styles.active : styles.link}
              onClick={() => onChange(item.id)}
            >
              {item.label}
              {item.id === 'telegram' && telegramUnread > 0 && (
                <span className={styles.badge}>{telegramUnread}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
