import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { Column, Task, User } from '../types';
import { useI18n } from '../i18n';
import { TaskCard } from './TaskCard';
import styles from './BoardColumn.module.css';

interface Props {
  column: Column;
  tasks: Task[];
  users: User[];
  onOpenTask: (task: Task) => void;
  onRename: (column: Column) => void;
  onDelete: (column: Column) => void;
  onAddTask: (columnId: string) => void;
}

export function BoardColumn({
  column,
  tasks,
  users,
  onOpenTask,
  onRename,
  onDelete,
  onAddTask,
}: Props) {
  const { t } = useI18n();
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const ids = tasks.map((t) => t.id);

  return (
    <section className={styles.column}>
      <header className={styles.header}>
        <h3 className={styles.title}>{column.title}</h3>
        <span className={styles.count}>{tasks.length}</span>
        <div className={styles.menu}>
          <button type="button" className={styles.iconBtn} onClick={() => onRename(column)} title={t('board.rename')}>
            ✎
          </button>
          <button type="button" className={styles.iconBtn} onClick={() => onDelete(column)} title={t('board.delete')}>
            ×
          </button>
        </div>
      </header>
      <div
        ref={setNodeRef}
        className={`${styles.dropZone} ${isOver ? styles.over : ''}`}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} users={users} onOpen={onOpenTask} />
          ))}
        </SortableContext>
      </div>
      <button type="button" className={styles.add} onClick={() => onAddTask(column.id)}>
        {t('board.addCard')}
      </button>
    </section>
  );
}
