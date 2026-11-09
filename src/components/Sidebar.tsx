import type { AppSection } from '../types';
import { useI18n } from '../i18n';
import type { MessageKey } from '../i18n';
import styles from './Sidebar.module.css';

const ITEMS: { id: AppSection; key: MessageKey }[] = [
  { id: 'board', key: 'sidebar.board' },
  { id: 'knowledge', key: 'sidebar.knowledge' },
  { id: 'ai', key: 'sidebar.ai' },
  { id: 'telegram', key: 'sidebar.telegram' },
  { id: 'team', key: 'sidebar.team' },
  { id: 'settings', key: 'sidebar.settings' },
];

interface Props {
  active: AppSection;
  onChange: (s: AppSection) => void;
  telegramUnread: number;
}

export function Sidebar({ active, onChange, telegramUnread }: Props) {
  const { t } = useI18n();

  return (
    <nav className={styles.sidebar} aria-label={t('sidebar.aria')}>
      <ul className={styles.list}>
        {ITEMS.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={active === item.id ? styles.active : styles.link}
              onClick={() => onChange(item.id)}
            >
              {t(item.key)}
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
