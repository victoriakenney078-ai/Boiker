import {
  DndContext,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core';
import { useMemo } from 'react';
import type { Column, Task } from '../types';
import { deleteColumn, deleteTask, putColumn } from '../services/storage';
import { tasksInColumn } from '../services/boardMove';
import { useBoard } from '../hooks/useAppData';
import { useBoardDnd } from '../hooks/useBoardDnd';
import { useI18n } from '../i18n';
import { BoardColumn } from './BoardColumn';
import { TaskCard } from './TaskCard';
import styles from './Board.module.css';

interface Props {
  search: string;
  onOpenTask: (task: Task | null, columnId?: string) => void;
}

export function Board({ search, onOpenTask }: Props) {
  const { columns, tasks, users, refresh } = useBoard();
  const { t } = useI18n();
  const { sensors, activeTask, onDragStart, onDragEnd } = useBoardDnd(columns, tasks, refresh);

  const q = search.trim().toLowerCase();
  const filteredTasks = useMemo(() => {
    if (!q) return tasks;
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(q) ||
        task.description.toLowerCase().includes(q) ||
        task.labels.some((label) => label.toLowerCase().includes(q)),
    );
  }, [tasks, q]);

  const tasksByColumn = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const col of columns) map.set(col.id, tasksInColumn(filteredTasks, col.id));
    return map;
  }, [columns, filteredTasks]);

  async function handleAddColumn() {
    const title = window.prompt(t('board.columnName'));
    if (!title?.trim()) return;
    await putColumn({ id: crypto.randomUUID(), title: title.trim(), order: columns.length });
    await refresh();
  }

  async function handleRename(column: Column) {
    const title = window.prompt(t('board.columnRename'), column.title);
    if (!title?.trim() || title === column.title) return;
    await putColumn({ ...column, title: title.trim() });
    await refresh();
  }

  async function handleDelete(column: Column) {
    const inCol = tasks.filter((task) => task.columnId === column.id);
    if (inCol.length > 0) {
      const ok = window.confirm(
        t('board.deleteColumnTasks', { title: column.title, count: inCol.length }),
      );
      if (!ok) return;
      for (const task of inCol) {
        await deleteTask(task.id);
      }
    } else {
      const ok = window.confirm(t('board.deleteColumn', { title: column.title }));
      if (!ok) return;
    }
    await deleteColumn(column.id);
    await refresh();
  }

  return (
    <div className={styles.boardWrap}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={(event) => void onDragEnd(event)}
      >
        <div className={styles.board}>
          {columns.map((col) => (
            <BoardColumn
              key={col.id}
              column={col}
              tasks={tasksByColumn.get(col.id) ?? []}
              users={users}
              onOpenTask={onOpenTask}
              onRename={handleRename}
              onDelete={handleDelete}
              onAddTask={(columnId) => onOpenTask(null, columnId)}
            />
          ))}
          <button type="button" className={styles.addColumn} onClick={() => void handleAddColumn()}>
            {t('board.addColumn')}
          </button>
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className={styles.overlay}>
              <TaskCard task={activeTask} users={users} onOpen={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
