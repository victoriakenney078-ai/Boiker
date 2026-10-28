import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { seedIfEmpty } from '../services/seed';
import {
  getAllColumns,
  getAllTasks,
  getAllUsers,
  getKnowledgeDocs,
  getSettings,
  getTelegramInbox,
} from '../services/storage';
import type {
  Column,
  KnowledgeDoc,
  ProjectSettings,
  Task,
  TelegramInbound,
  User,
} from '../types';

interface AppData {
  users: User[];
  columns: Column[];
  tasks: Task[];
  knowledgeDocs: KnowledgeDoc[];
  telegram: TelegramInbound[];
  settings: ProjectSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>([]);
  const [telegram, setTelegram] = useState<TelegramInbound[]>([]);
  const [settings, setSettings] = useState<ProjectSettings>({
    projectName: 'Демо',
    openAiApiKeyConfigured: Boolean(import.meta.env.VITE_OPENAI_API_KEY),
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    await seedIfEmpty();
    const [u, c, t, k, tg, s] = await Promise.all([
      getAllUsers(),
      getAllColumns(),
      getAllTasks(),
      getKnowledgeDocs(),
      getTelegramInbox(),
      getSettings(),
    ]);
    setUsers(u);
    setColumns(c);
    setTasks(t);
    setKnowledgeDocs(k);
    setTelegram(tg);
    setSettings({
      ...s,
      openAiApiKeyConfigured: Boolean(import.meta.env.VITE_OPENAI_API_KEY),
    });
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const value = useMemo(
    () => ({
      users,
      columns,
      tasks,
      knowledgeDocs,
      telegram,
      settings,
      loading,
      refresh,
    }),
    [users, columns, tasks, knowledgeDocs, telegram, settings, loading, refresh],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData вне AppDataProvider');
  return ctx;
}

export function useBoard() {
  const { columns, tasks, users, refresh } = useAppData();
  return { columns, tasks, users, refresh };
}

export function useKnowledge() {
  const { knowledgeDocs, refresh } = useAppData();
  return { knowledgeDocs, refresh };
}
