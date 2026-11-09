import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useMemo, useState } from 'react';
import type { Column, Task } from '../types';
import { deleteColumn, deleteTask, putColumn, putTask, putTasks } from '../services/storage';
import { useBoard } from '../hooks/useAppData';
import { useI18n } from '../i18n';
import { BoardColumn } from './BoardColumn';
import { TaskCard } from './TaskCard';
import styles from './Board.module.css';

interface Props {
  search: string;
  onOpenTask: (task: Task | null, columnId?: string) => void;
}

function now() {
  return new Date().toISOString();
}

export function Board({ search, onOpenTask }: Props) {
  const { columns, tasks, users, refresh } = useBoard();
  const { t } = useI18n();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const q = search.trim().toLowerCase();
  const filteredTasks = useMemo(() => {
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.labels.some((l) => l.toLowerCase().includes(q)),
    );
  }, [tasks, q]);

  const tasksByColumn = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const col of columns) map.set(col.id, []);
    for (const task of filteredTasks) {
      const list = map.get(task.columnId);
      if (list) list.push(task);
    }
    for (const [, list] of map) {
      list.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    }
    return map;
  }, [columns, filteredTasks]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : undefined;

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const overId = String(over.id);
    const overColumn = columns.find((c) => c.id === overId);
    const overTask = tasks.find((t) => t.id === overId);

    let targetColumnId = task.columnId;
    if (overColumn) targetColumnId = overColumn.id;
    else if (overTask) targetColumnId = overTask.columnId;

    if (overColumn && overColumn.id === task.columnId) return;

    if (overTask && overTask.columnId === task.columnId && overTask.id !== task.id) {
      const colTasks = tasks
        .filter((t) => t.columnId === task.columnId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const oldIndex = colTasks.findIndex((t) => t.id === taskId);
      const newIndex = colTasks.findIndex((t) => t.id === overTask.id);
      if (oldIndex >= 0 && newIndex >= 0) {
        const reordered = arrayMove(colTasks, oldIndex, newIndex);
        const updated = reordered.map((t, i) => ({
          ...t,
          createdAt: new Date(Date.now() + i).toISOString(),
          updatedAt: now(),
        }));
        await putTasks(updated);
        await refresh();
      }
      return;
    }

    if (targetColumnId !== task.columnId || overColumn) {
      await putTask({
        ...task,
        columnId: targetColumnId,
        updatedAt: now(),
      });
      await refresh();
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleAddColumn() {
    const title = window.prompt(t('board.columnName'));
    if (!title?.trim()) return;
    const order = columns.length;
    await putColumn({ id: crypto.randomUUID(), title: title.trim(), order });
    await refresh();
  }

  async function handleRename(column: Column) {
    const title = window.prompt(t('board.columnRename'), column.title);
    if (!title?.trim() || title === column.title) return;
    await putColumn({ ...column, title: title.trim() });
    await refresh();
  }

  async function handleDelete(column: Column) {
    const inCol = tasks.filter((t) => t.columnId === column.id);
    if (inCol.length > 0) {
      const ok = window.confirm(
        t('board.deleteColumnTasks', { title: column.title, count: inCol.length }),
      );
      if (!ok) return;
      for (const t of inCol) {
        await deleteTask(t.id);
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
        onDragStart={handleDragStart}
        onDragEnd={(e) => void handleDragEnd(e)}
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
