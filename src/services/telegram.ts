import type { Task, TelegramInbound, TelegramWebhookPayload } from '../types';
import { isoNow } from '../lib/isoNow';
import { tStatic } from '../i18n';
import { getBacklogColumnId, putTask } from './boardRemote';
import { getSettings, getTelegramInbox, putTelegramInbound } from './storage';

function uid(): string {
  return crypto.randomUUID();
}

export type { TelegramWebhookPayload };

export async function ingestTelegramMessage(
  payload: TelegramWebhookPayload,
): Promise<TelegramInbound | { error: string }> {
  const settings = await getSettings();
  const secret = settings.telegramWebhookSecret?.trim();
  if (secret && payload.secret !== secret) {
    return { error: tStatic('telegram.errorSecret') };
  }

  const item: TelegramInbound = {
    id: uid(),
    chatId: payload.chatId,
    fromUsername: payload.fromUsername,
    text: payload.text,
    receivedAt: isoNow(),
    processed: false,
    linkedTaskId: null,
  };

  await putTelegramInbound(item);
  return item;
}

const DEMO_MESSAGES = [
  'Срочно: обновить документацию API',
  'Можно ли перенести релиз на следующую неделю?',
  'Добавить уведомление при назначении задачи',
  'Проверить мобильную вёрстку sidebar',
];

export async function simulateTelegramMessage(): Promise<TelegramInbound> {
  const settings = await getSettings();
  const text = DEMO_MESSAGES[Math.floor(Math.random() * DEMO_MESSAGES.length)]!;
  const result = await ingestTelegramMessage({
    secret: settings.telegramWebhookSecret?.trim() ?? '',
    chatId: `-100${Math.floor(Math.random() * 1_000_000)}`,
    fromUsername: `user_${Math.floor(Math.random() * 100)}`,
    text,
  });
  if ('error' in result) {
    throw new Error(result.error);
  }
  return result;
}

export async function loadTelegramInbox(): Promise<TelegramInbound[]> {
  return getTelegramInbox();
}

export async function updateTelegramItem(item: TelegramInbound): Promise<void> {
  await putTelegramInbound(item);
}

export async function createTaskFromInbound(
  item: TelegramInbound,
  boardId: string,
): Promise<string | null> {
  const backlogId = await getBacklogColumnId(boardId);
  if (!backlogId) return null;

  const ts = isoNow();
  const title = item.text.length > 80 ? `${item.text.slice(0, 77)}…` : item.text;
  const taskId = crypto.randomUUID();
  const task: Task = {
    id: taskId,
    boardId,
    columnId: backlogId,
    title,
    description: item.text,
    assigneeId: null,
    priority: 'medium',
    labels: ['Telegram'],
    subtasks: [],
    parentTaskId: null,
    source: 'telegram',
    createdAt: ts,
    updatedAt: ts,
  };
  await putTask(task);
  await updateTelegramItem({
    ...item,
    processed: true,
    linkedTaskId: taskId,
  });
  return taskId;
}
