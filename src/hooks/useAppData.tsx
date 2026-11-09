import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getAllBoards as getLocalBoards,
  getAllColumns as getLocalColumns,
  getAllTasks as getLocalTasks,
  getAllUsers,
  getKnowledgeDocs,
  getSettings,
  getTelegramInbox,
} from '../services/storage';
import {
  getAllBoards,
  getAllColumns,
  getAllTasks,
  migrateBoardsFromIdbIfNeeded,
} from '../services/boardRemote';
import { seedIfEmpty, seedRemoteDemoIfNeeded } from '../services/seed';
import type {
  Board,
  Column,
  KnowledgeDoc,
  ProjectSettings,
  Task,
  TelegramInbound,
  User,
} from '../types';

interface AppData {
  users: User[];
  boards: Board[];
  columns: Column[];
  tasks: Task[];
  knowledgeDocs: KnowledgeDoc[];
  telegram: TelegramInbound[];
  settings: ProjectSettings;
  loading: boolean;
  activeBoardId: string | null;
  setActiveBoardId: (id: string | null) => void;
  refresh: () => Promise<void>;
}

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [allColumns, setAllColumns] = useState<Column[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>([]);
  const [telegram, setTelegram] = useState<TelegramInbound[]>([]);
  const [settings, setSettings] = useState<ProjectSettings>({
    projectName: 'Демо',
    openAiApiKeyConfigured: Boolean(import.meta.env.VITE_OPENAI_API_KEY),
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    await seedIfEmpty();
    await migrateBoardsFromIdbIfNeeded(
      await getLocalBoards(),
      await getLocalColumns(),
      await getLocalTasks(),
    );
    await seedRemoteDemoIfNeeded();
    const [u, b, c, t, k, tg, s] = await Promise.all([
      getAllUsers(),
      getAllBoards(),
      getAllColumns(),
      getAllTasks(),
      getKnowledgeDocs(),
      getTelegramInbox(),
      getSettings(),
    ]);
    setUsers(u);
    setBoards(b);
    setAllColumns(c);
    setAllTasks(t);
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

  const columns = useMemo(
    () => (activeBoardId ? allColumns.filter((column) => column.boardId === activeBoardId) : allColumns),
    [allColumns, activeBoardId],
  );
  const tasks = useMemo(
    () => (activeBoardId ? allTasks.filter((task) => task.boardId === activeBoardId) : allTasks),
    [allTasks, activeBoardId],
  );

  const value = useMemo(
    () => ({
      users,
      boards,
      columns,
      tasks,
      knowledgeDocs,
      telegram,
      settings,
      loading,
      activeBoardId,
      setActiveBoardId,
      refresh,
    }),
    [
      users,
      boards,
      columns,
      tasks,
      knowledgeDocs,
      telegram,
      settings,
      loading,
      activeBoardId,
      refresh,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData вне AppDataProvider');
  return ctx;
}

export function useBoard() {
  const { columns, tasks, users, refresh, activeBoardId } = useAppData();
  return { columns, tasks, users, refresh, activeBoardId };
}

export function useKnowledge() {
  const { knowledgeDocs, refresh } = useAppData();
  return { knowledgeDocs, refresh };
}
