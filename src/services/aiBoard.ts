import type { AiDecompositionDraft } from '../types';
import { isoNow } from '../lib/isoNow';
import { getBacklogColumnId } from './seed';
import { putTask } from './storage';

export async function createEpicOnBoard(
  draft: AiDecompositionDraft,
): Promise<{ ok: true } | { ok: false; reason: 'no-backlog' }> {
  const backlogId = await getBacklogColumnId();
  if (!backlogId) return { ok: false, reason: 'no-backlog' };

  const ts = isoNow();
  const epicId = crypto.randomUUID();
  await putTask({
    id: epicId,
    columnId: backlogId,
    title: draft.epicTitle,
    description: draft.epicDescription,
    assigneeId: null,
    priority: 'high',
    labels: ['Эпик'],
    subtasks: [],
    parentTaskId: null,
    source: 'ai',
    createdAt: ts,
    updatedAt: ts,
  });

  for (const suggested of draft.suggestedTasks) {
    const createdAt = isoNow();
    await putTask({
      id: crypto.randomUUID(),
      columnId: backlogId,
      title: suggested.title,
      description: suggested.description,
      assigneeId: suggested.suggestedAssigneeId,
      priority: suggested.priority,
      labels: [],
      subtasks: [],
      parentTaskId: epicId,
      source: 'ai',
      createdAt,
      updatedAt: createdAt,
    });
  }

  return { ok: true };
}
