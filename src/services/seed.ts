import type { Task, TelegramInbound, User } from '../types';
import { isoNow } from '../lib/isoNow';
import {
  createBoardWithColumns,
  findBacklogId,
  getAllBoards,
  getBacklogColumnId,
  putTask,
} from './boardRemote';
import {
  isSeeded,
  markSeeded,
  putSettings,
  putTelegramInbound,
  putUser,
} from './storage';

export { findBacklogId, getBacklogColumnId, createBoardWithColumns };

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b'];

function uid(): string {
  return crypto.randomUUID();
}

export async function seedIfEmpty(): Promise<void> {
  if (await isSeeded()) return;

  const users: User[] = [
    { id: uid(), name: 'Алексей', avatarColor: COLORS[0], telegramUsername: 'alex_dev' },
    { id: uid(), name: 'Мария', avatarColor: COLORS[1], telegramUsername: 'maria_pm' },
    { id: uid(), name: 'Иван', avatarColor: COLORS[2] },
    { id: uid(), name: 'Ольга', avatarColor: COLORS[3], telegramUsername: 'olga_qa' },
  ];

  for (const u of users) await putUser(u);

  const mockTelegram: TelegramInbound[] = [
    {
      id: uid(),
      chatId: '-100123456',
      fromUsername: 'maria_pm',
      text: 'Нужно добавить фильтр по исполнителю на доске до пятницы',
      receivedAt: new Date(Date.now() - 3600_000).toISOString(),
      processed: false,
      linkedTaskId: null,
    },
    {
      id: uid(),
      chatId: '-100123456',
      fromUsername: 'alex_dev',
      text: 'Баг: карточка не перетаскивается в Safari',
      receivedAt: new Date(Date.now() - 7200_000).toISOString(),
      processed: false,
      linkedTaskId: null,
    },
  ];

  for (const m of mockTelegram) await putTelegramInbound(m);

  await putSettings({
    projectName: 'Демо',
    openAiApiKeyConfigured: Boolean(import.meta.env.VITE_OPENAI_API_KEY),
    telegramWebhookSecret: '',
  });

  await markSeeded();
}

export async function seedRemoteDemoIfNeeded(): Promise<void> {
  const boards = await getAllBoards();
  if (boards.length > 0) return;

  const { getAllUsers } = await import('./storage');
  const users = await getAllUsers();
  if (users.length === 0) return;

  const { board, columns } = await createBoardWithColumns(
    'Демо',
    '',
    users.map((user) => user.id),
  );

  const backlogId = columns[0]!.id;
  const inProgressId = columns[1]!.id;
  const reviewId = columns[2]!.id;

  const demoTasks: Omit<Task, 'id'>[] = [
    {
      boardId: board.id,
      columnId: backlogId,
      title: 'Подготовить roadmap Q2',
      description: 'Согласовать с командой приоритеты на квартал.',
      assigneeId: users[1]!.id,
      priority: 'high',
      labels: ['Планирование'],
      subtasks: [],
      parentTaskId: null,
      source: 'manual',
      createdAt: isoNow(),
      updatedAt: isoNow(),
    },
    {
      boardId: board.id,
      columnId: inProgressId,
      title: 'Интеграция Telegram inbox',
      description: 'Mock + симуляция входящих сообщений.',
      assigneeId: users[0]!.id,
      priority: 'medium',
      labels: ['Интеграция'],
      subtasks: [
        { id: uid(), title: 'Контракт webhook', done: true },
        { id: uid(), title: 'UI inbox', done: false },
      ],
      parentTaskId: null,
      source: 'manual',
      createdAt: isoNow(),
      updatedAt: isoNow(),
    },
    {
      boardId: board.id,
      columnId: reviewId,
      title: 'База знаний: загрузка md',
      description: 'Проверить загрузку и просмотр markdown.',
      assigneeId: users[3]!.id,
      priority: 'low',
      labels: [],
      subtasks: [],
      parentTaskId: null,
      source: 'manual',
      createdAt: isoNow(),
      updatedAt: isoNow(),
    },
  ];

  for (const t of demoTasks) {
    await putTask({ ...t, id: uid() });
  }
}
