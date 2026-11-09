import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Priority, Task, User } from '../types';
import { useI18n } from '../i18n';
import type { MessageKey } from '../i18n';
import styles from './TaskCard.module.css';

const PRIORITY_KEYS: Record<Priority, MessageKey> = {
  low: 'priority.low',
  medium: 'priority.medium',
  high: 'priority.high',
  critical: 'priority.critical',
};

interface Props {
  task: Task;
  users: User[];
  onOpen: (task: Task) => void;
}

export function TaskCard({ task, users, onOpen }: Props) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const assignee = users.find((u) => u.id === task.assigneeId);

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={styles.card}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(task);
      }}
      role="button"
      tabIndex={0}
    >
      <div className={styles.top}>
        <span className={`${styles.priority} ${styles[task.priority]}`}>
          {t(PRIORITY_KEYS[task.priority])}
        </span>
        {task.source !== 'manual' && (
          <span className={styles.source}>
            {task.source === 'ai' ? t('task.sourceAi') : t('task.sourceTg')}
          </span>
        )}
      </div>
      <h4 className={styles.title}>{task.title}</h4>
      {task.labels.length > 0 && (
        <div className={styles.labels}>
          {task.labels.map((l) => (
            <span key={l} className={styles.label}>
              {l}
            </span>
          ))}
        </div>
      )}
      {assignee && (
        <div className={styles.footer}>
          <span
            className={styles.avatar}
            style={{ background: assignee.avatarColor ?? '#94a3b8' }}
            title={assignee.name}
          >
            {assignee.name.charAt(0)}
          </span>
        </div>
      )}
    </article>
  );
}
