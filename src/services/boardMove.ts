import { arrayMove } from '@dnd-kit/sortable';
import type { Column, Task } from '../types';
import { isoNow } from '../lib/isoNow';
import { putTask, putTasks } from './storage';

export function tasksInColumn(tasks: Task[], columnId: string): Task[] {
  return tasks
    .filter((task) => task.columnId === columnId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function resolveDropTarget(
  task: Task,
  overId: string,
  columns: Column[],
  tasks: Task[],
): { targetColumnId: string; overColumn?: Column; overTask?: Task } {
  const overColumn = columns.find((column) => column.id === overId);
  const overTask = tasks.find((item) => item.id === overId);
  let targetColumnId = task.columnId;
  if (overColumn) targetColumnId = overColumn.id;
  else if (overTask) targetColumnId = overTask.columnId;
  return { targetColumnId, overColumn, overTask };
}

export async function reorderInColumn(
  tasks: Task[],
  columnId: string,
  taskId: string,
  overTaskId: string,
): Promise<boolean> {
  const colTasks = tasksInColumn(tasks, columnId);
  const oldIndex = colTasks.findIndex((item) => item.id === taskId);
  const newIndex = colTasks.findIndex((item) => item.id === overTaskId);
  if (oldIndex < 0 || newIndex < 0) return false;

  const updated = arrayMove(colTasks, oldIndex, newIndex).map((item, i) => ({
    ...item,
    createdAt: new Date(Date.now() + i).toISOString(),
    updatedAt: isoNow(),
  }));
  await putTasks(updated);
  return true;
}

export async function moveToColumn(task: Task, columnId: string): Promise<void> {
  await putTask({
    ...task,
    columnId,
    updatedAt: isoNow(),
  });
}
