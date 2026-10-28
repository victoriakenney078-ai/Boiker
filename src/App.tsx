import { useMemo, useState } from 'react';
import type { AppSection, Task } from './types';
import { AppDataProvider, useAppData } from './hooks/useAppData';
import { LandingPage } from './components/landing/LandingPage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Board } from './components/Board';
import { TaskModal } from './components/TaskModal';
import { KnowledgePanel } from './components/KnowledgePanel';
import { AiPanel } from './components/AiPanel';
import { TelegramInbox } from './components/TelegramInbox';
import { TeamPanel } from './components/TeamPanel';
import { SettingsPanel } from './components/SettingsPanel';
import styles from './App.module.css';

function AppShell({ onBackToLanding }: { onBackToLanding: () => void }) {
  const { settings, tasks, columns, users, telegram, loading, refresh } = useAppData();
  const [section, setSection] = useState<AppSection>('board');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultColumnId, setDefaultColumnId] = useState('');
  const [aiDocIds, setAiDocIds] = useState<string[]>([]);

  const backlogId = useMemo(
    () => columns.find((c) => c.title === 'Бэклог')?.id ?? columns[0]?.id ?? '',
    [columns],
  );

  const telegramUnread = telegram.filter((t) => !t.processed).length;

  function openTask(task: Task | null, columnId?: string) {
    setEditingTask(task);
    setDefaultColumnId(columnId ?? backlogId);
    setModalOpen(true);
  }

  function toggleAiDoc(id: string) {
    setAiDocIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Загрузка AivibeBoard…</p>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <Header
        projectName={settings.projectName}
        search={search}
        onSearchChange={setSearch}
        onAddTask={() => openTask(null, backlogId)}
        onBackToLanding={onBackToLanding}
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
        onClose={() => setModalOpen(false)}
        onSaved={() => void refresh()}
      />
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<'landing' | 'app'>('landing');

  if (view === 'landing') {
    return <LandingPage onOpenApp={() => setView('app')} />;
  }

  return (
    <AppDataProvider>
      <AppShell onBackToLanding={() => setView('landing')} />
    </AppDataProvider>
  );
}
