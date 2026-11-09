import { useEffect, useMemo, useState } from 'react';
import type { AppSection, Task } from './types';
import { AppDataProvider, useAppData } from './hooks/useAppData';
import { supabase } from './services/supabase';
import { LandingPage } from './components/landing/LandingPage';
import { AuthPage } from './components/landing/AuthPage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Board } from './components/Board';
import { TaskModal } from './components/TaskModal';
import { KnowledgePanel } from './components/KnowledgePanel';
import { AiPanel } from './components/AiPanel';
import { TelegramInbox } from './components/TelegramInbox';
import { TeamPanel } from './components/TeamPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { useI18n } from './i18n';
import styles from './App.module.css';

function AppShell({
  onBackToLanding,
  onSignOut,
}: {
  onBackToLanding: () => void;
  onSignOut: () => void;
}) {
  const { settings, tasks, columns, users, telegram, loading, refresh } = useAppData();
  const { t } = useI18n();
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
        <p>{t('app.loadingBoard')}</p>
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
        onClose={() => setModalOpen(false)}
        onSaved={() => void refresh()}
      />
    </div>
  );
}

type AppView = 'landing' | 'auth' | 'app';

export default function App() {
  const { t } = useI18n();
  const [view, setView] = useState<AppView>('landing');
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const hasSession = Boolean(data.session);
      setSignedIn(hasSession);
      if (hasSession) setView('app');
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSignedIn(Boolean(session));
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        setView('app');
      }
      if (event === 'SIGNED_OUT') setView('landing');
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setView('landing');
  }

  if (!ready) {
    return (
      <div className={styles.loading}>
        <p>{t('app.loading')}</p>
      </div>
    );
  }

  if (view === 'auth') {
    return (
      <AuthPage
        onBack={() => setView('landing')}
        onSuccess={() => {
          setSignedIn(true);
          setView('app');
        }}
      />
    );
  }

  if (view === 'landing') {
    return (
      <LandingPage
        signedIn={signedIn}
        onOpenAuth={() => setView('auth')}
        onOpenApp={() => setView('app')}
      />
    );
  }

  return (
    <AppDataProvider>
      <AppShell onBackToLanding={() => setView('landing')} onSignOut={() => void signOut()} />
    </AppDataProvider>
  );
}
