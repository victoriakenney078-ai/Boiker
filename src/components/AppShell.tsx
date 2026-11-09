import { useMemo, useState } from 'react';
import type { AppSection, Task } from '../types';
import { useAppData } from '../hooks/useAppData';
import { findBacklogId } from '../services/seed';
import { useI18n } from '../i18n';
import { Header } from './Header';
import { BoardsPage } from './BoardsPage';
import { Sidebar } from './Sidebar';
import { Board } from './Board';
import { TaskModal } from './TaskModal';
import { KnowledgePanel } from './KnowledgePanel';
import { AiPanel } from './AiPanel';
import { TelegramInbox } from './TelegramInbox';
import { TeamPanel } from './TeamPanel';
import { SettingsPanel } from './SettingsPanel';
import styles from '../App.module.css';

interface Props {
  onBackToLanding: () => void;
  onSignOut: () => void;
}

export function AppShell({ onBackToLanding, onSignOut }: Props) {
  const {
    settings,
    boards,
    tasks,
    columns,
    users,
    telegram,
    loading,
    refresh,
    activeBoardId,
    setActiveBoardId,
  } = useAppData();
  const { t } = useI18n();
  const [section, setSection] = useState<AppSection>('board');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultColumnId, setDefaultColumnId] = useState('');
  const [aiDocIds, setAiDocIds] = useState<string[]>([]);

  const backlogId = useMemo(() => findBacklogId(columns) ?? '', [columns]);
  const telegramUnread = telegram.filter((item) => !item.processed).length;
  const activeBoard = boards.find((board) => board.id === activeBoardId) ?? null;

  function openBoard(boardId: string) {
    setSection('board');
    setSearch('');
    setActiveBoardId(boardId);
  }

  function closeBoard() {
    setSection('board');
    setSearch('');
    setModalOpen(false);
    setActiveBoardId(null);
  }

  function openTask(task: Task | null, columnId?: string) {
    setEditingTask(task);
    setDefaultColumnId(columnId ?? backlogId);
    setModalOpen(true);
  }

  function toggleAiDoc(id: string) {
    setAiDocIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>{t('app.loadingBoard')}</p>
      </div>
    );
  }

  if (!activeBoard) {
    return (
      <div className={styles.app}>
        <Header
          projectName={settings.projectName}
          onBackToLanding={onBackToLanding}
          onSignOut={onSignOut}
        />
        <main className={styles.main}>
          <BoardsPage onOpen={openBoard} />
        </main>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <Header
        projectName={activeBoard.name}
        search={search}
        onSearchChange={setSearch}
        onAddTask={() => openTask(null, backlogId)}
        onBackToLanding={onBackToLanding}
        onBackToBoards={closeBoard}
        onSignOut={onSignOut}
      />
      <div className={styles.body}>
        <Sidebar active={section} onChange={setSection} telegramUnread={telegramUnread} />
        <main className={styles.main}>
          {section === 'board' && <Board search={search} onOpenTask={openTask} />}
          {section === 'knowledge' && (
            <KnowledgePanel selectedForAi={aiDocIds} onToggleAiDoc={toggleAiDoc} />
          )}
          {section === 'ai' && <AiPanel selectedDocIds={aiDocIds} />}
          {section === 'telegram' && <TelegramInbox />}
          {section === 'team' && <TeamPanel />}
          {section === 'settings' && <SettingsPanel />}
        </main>
      </div>
      <TaskModal
        open={modalOpen}
        task={editingTask}
        users={users}
        tasks={tasks}
        defaultColumnId={defaultColumnId}
        boardId={activeBoard.id}
        onClose={() => setModalOpen(false)}
        onSaved={() => void refresh()}
      />
    </div>
  );
}
