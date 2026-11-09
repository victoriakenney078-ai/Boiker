import {
  openDB,
  type DBSchema,
  type IDBPDatabase,
  type IDBPTransaction,
  type StoreNames,
} from 'idb';
import type {
  Board,
  Column,
  KnowledgeDoc,
  ProjectSettings,
  Task,
  TelegramInbound,
  User,
} from '../types';

interface AivibeDB extends DBSchema {
  users: { key: string; value: User };
  boards: { key: string; value: Board };
  columns: { key: string; value: Column };
  tasks: { key: string; value: Task; indexes: { 'by-column': string } };
  knowledgeMeta: { key: string; value: KnowledgeDoc };
  knowledgeText: { key: string; value: string };
  telegram: { key: string; value: TelegramInbound };
  meta: { key: string; value: boolean | ProjectSettings };
}

const DB_NAME = 'aivibeboard';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<AivibeDB>> | null = null;

function boardNameFromSettings(stored: boolean | ProjectSettings | undefined): string {
  if (stored && typeof stored === 'object' && stored.projectName.trim()) {
    return stored.projectName.trim();
  }
  return 'Демо';
}

async function migrateLegacyDataToBoard(
  transaction: IDBPTransaction<AivibeDB, StoreNames<AivibeDB>[], 'versionchange'>,
): Promise<void> {
  const columnsStore = transaction.objectStore('columns');
  const tasksStore = transaction.objectStore('tasks');
  const columns = await columnsStore.getAll();
  const tasks = await tasksStore.getAll();
  const legacyColumns = columns.filter((column) => !column.boardId);
  const legacyTasks = tasks.filter((task) => !task.boardId);
  if (legacyColumns.length === 0 && legacyTasks.length === 0) return;

  const settings = await transaction.objectStore('meta').get('settings');
  const now = new Date().toISOString();
  const board: Board = {
    id: crypto.randomUUID(),
    name: boardNameFromSettings(settings),
    description: '',
    memberIds: [],
    createdAt: now,
    updatedAt: now,
  };
  await transaction.objectStore('boards').put(board);
  for (const column of legacyColumns) {
    await columnsStore.put({ ...column, boardId: board.id });
  }
  for (const task of legacyTasks) {
    await tasksStore.put({ ...task, boardId: board.id });
  }
}

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<AivibeDB>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          db.createObjectStore('users', { keyPath: 'id' });
          db.createObjectStore('columns', { keyPath: 'id' });
          const tasks = db.createObjectStore('tasks', { keyPath: 'id' });
          tasks.createIndex('by-column', 'columnId');
          db.createObjectStore('knowledgeMeta', { keyPath: 'id' });
          db.createObjectStore('knowledgeText');
          db.createObjectStore('telegram', { keyPath: 'id' });
          db.createObjectStore('meta');
        }
        if (oldVersion < 2) {
          db.createObjectStore('boards', { keyPath: 'id' });
        }
        if (oldVersion >= 1 && oldVersion < 2) {
          await migrateLegacyDataToBoard(transaction);
        }
      },
    });
  }
  return dbPromise;
}

export async function isSeeded(): Promise<boolean> {
  const db = await getDb();
  return (await db.get('meta', 'seeded')) === true;
}

export async function markSeeded(): Promise<void> {
  const db = await getDb();
  await db.put('meta', true, 'seeded');
}

export async function getAllUsers(): Promise<User[]> {
  const db = await getDb();
  return db.getAll('users');
}

export async function putUser(user: User): Promise<void> {
  const db = await getDb();
  await db.put('users', user);
}

export async function deleteUser(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('users', id);
}

function normalizeBoard(board: Board): Board {
  return {
    ...board,
    description: board.description ?? '',
    memberIds: Array.isArray(board.memberIds) ? board.memberIds : [],
  };
}

export async function getAllBoards(): Promise<Board[]> {
  const db = await getDb();
  const boards = await db.getAll('boards');
  return boards.map(normalizeBoard).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function putBoard(board: Board): Promise<void> {
  const db = await getDb();
  await db.put('boards', board);
}

export async function deleteBoard(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['boards', 'columns', 'tasks'], 'readwrite');
  const [columns, tasks] = await Promise.all([
    tx.objectStore('columns').getAll(),
    tx.objectStore('tasks').getAll(),
  ]);
  await Promise.all([
    ...columns.filter((column) => column.boardId === id).map((column) => tx.objectStore('columns').delete(column.id)),
    ...tasks.filter((task) => task.boardId === id).map((task) => tx.objectStore('tasks').delete(task.id)),
    tx.objectStore('boards').delete(id),
  ]);
  await tx.done;
}

export async function getAllColumns(): Promise<Column[]> {
  const db = await getDb();
  const cols = await db.getAll('columns');
  return cols.sort((a, b) => a.order - b.order);
}

export async function putColumn(column: Column): Promise<void> {
  const db = await getDb();
  await db.put('columns', column);
}

export async function deleteColumn(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('columns', id);
}

export async function getAllTasks(): Promise<Task[]> {
  const db = await getDb();
  return db.getAll('tasks');
}

export async function putTask(task: Task): Promise<void> {
  const db = await getDb();
  await db.put('tasks', task);
}

export async function putTasks(tasks: Task[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('tasks', 'readwrite');
  await Promise.all(tasks.map((t) => tx.store.put(t)));
  await tx.done;
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('tasks', id);
}

export async function getKnowledgeDocs(): Promise<KnowledgeDoc[]> {
  const db = await getDb();
  const docs = await db.getAll('knowledgeMeta');
  return docs.sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );
}

export async function putKnowledgeDoc(
  meta: KnowledgeDoc,
  fullText: string,
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['knowledgeMeta', 'knowledgeText'], 'readwrite');
  await tx.objectStore('knowledgeMeta').put(meta);
  await tx.objectStore('knowledgeText').put(fullText, meta.id);
  await tx.done;
}

export async function getKnowledgeText(id: string): Promise<string | undefined> {
  const db = await getDb();
  return db.get('knowledgeText', id);
}

export async function deleteKnowledgeDoc(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['knowledgeMeta', 'knowledgeText'], 'readwrite');
  await tx.objectStore('knowledgeMeta').delete(id);
  await tx.objectStore('knowledgeText').delete(id);
  await tx.done;
}

export async function getTelegramInbox(): Promise<TelegramInbound[]> {
  const db = await getDb();
  const items = await db.getAll('telegram');
  return items.sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
  );
}

export async function putTelegramInbound(item: TelegramInbound): Promise<void> {
  const db = await getDb();
  await db.put('telegram', item);
}

export async function getSettings(): Promise<ProjectSettings> {
  const db = await getDb();
  const stored = await db.get('meta', 'settings');
  if (stored && typeof stored === 'object' && 'projectName' in stored) {
    return stored as ProjectSettings;
  }
  return {
    projectName: 'Демо',
    openAiApiKeyConfigured: Boolean(import.meta.env.VITE_OPENAI_API_KEY),
  };
}

export async function putSettings(settings: ProjectSettings): Promise<void> {
  const db = await getDb();
  await db.put('meta', settings, 'settings');
}
