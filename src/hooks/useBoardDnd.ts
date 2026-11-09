import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useState } from 'react';
import type { Column, Task } from '../types';
import { moveToColumn, reorderInColumn, resolveDropTarget } from '../services/boardMove';

export function useBoardDnd(
  columns: Column[],
  tasks: Task[],
  refresh: () => Promise<void>,
) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    const { targetColumnId, overColumn, overTask } = resolveDropTarget(
      task,
      String(over.id),
      columns,
      tasks,
    );

    if (overColumn && overColumn.id === task.columnId) return;

    if (overTask && overTask.columnId === task.columnId && overTask.id !== task.id) {
      const moved = await reorderInColumn(tasks, task.columnId, taskId, overTask.id);
      if (moved) await refresh();
      return;
    }

    if (targetColumnId !== task.columnId || overColumn) {
      await moveToColumn(task, targetColumnId);
      await refresh();
    }
  }

  const activeTask = activeId ? tasks.find((item) => item.id === activeId) : undefined;

  return { sensors, activeTask, onDragStart, onDragEnd };
}
