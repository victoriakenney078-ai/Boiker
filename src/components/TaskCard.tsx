import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task, User } from '../types';
import { PRIORITY_KEYS, useI18n } from '../i18n';
import styles from './TaskCard.module.css';

interface Props {
  task: Task;
  boardMembers: User[];
  onOpen: (task: Task) => void;
  onAssign: (task: Task, assigneeId: string | null) => void;
  onDelete: (task: Task) => void;
}

export function TaskCard({ task, boardMembers, onOpen, onAssign, onDelete }: Props) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const assignee = boardMembers.find((u) => u.id === task.assigneeId);

  function stopBubble(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  return (
    <article ref={setNodeRef} style={style} className={styles.card}>
      <div className={styles.inner}>
        <button
          type="button"
          className={styles.dragHandle}
          aria-label={t('task.dragHandle')}
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
        <div
          role="button"
          tabIndex={0}
          className={styles.body}
          onClick={() => onOpen(task)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpen(task);
            }
          }}
          aria-label={t('task.editCard')}
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
          <div className={styles.footer} onClick={stopBubble} onKeyDown={stopBubble}>
            <label className={styles.assignPick}>
              <span className={styles.srOnly}>{t('task.assignOnCard')}</span>
              <select
                className={styles.assignSelect}
                value={task.assigneeId ?? ''}
                title={t('task.assignOnCard')}
                onChange={(e) => onAssign(task, e.target.value || null)}
              >
                <option value="">{t('task.unassigned')}</option>
                {boardMembers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              {assignee && (
                <span
                  className={styles.avatar}
                  style={{ background: assignee.avatarColor ?? '#94a3b8' }}
                  title={assignee.name}
                  aria-hidden
                >
                  {assignee.name.charAt(0)}
                </span>
              )}
            </label>
            <button
              type="button"
              className={styles.deleteBtn}
              title={t('task.deleteOnCard')}
              aria-label={t('task.deleteOnCard')}
              onClick={() => onDelete(task)}
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
