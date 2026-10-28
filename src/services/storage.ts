import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  Column,
  KnowledgeDoc,
  ProjectSettings,
  Task,
  TelegramInbound,
  User,
} from '../types';

interface AivibeDB extends DBSchema {
  users: { key: string; value: User };
  columns: { key: string; value: Column };
  tasks: { key: string; value: Task; indexes: { 'by-column': string } };
  knowledgeMeta: { key: string; value: KnowledgeDoc };
  knowledgeText: { key: string; value: string };
  telegram: { key: string; value: TelegramInbound };
  meta: { key: string; value: boolean | ProjectSettings };
}

const DB_NAME = 'aivibeboard';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AivibeDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<AivibeDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('users', { keyPath: 'id' });
        db.createObjectStore('columns', { keyPath: 'id' });
        const tasks = db.createObjectStore('tasks', { keyPath: 'id' });
        tasks.createIndex('by-column', 'columnId');
        db.createObjectStore('knowledgeMeta', { keyPath: 'id' });
        db.createObjectStore('knowledgeText');
        db.createObjectStore('telegram', { keyPath: 'id' });
        db.createObjectStore('meta');
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
