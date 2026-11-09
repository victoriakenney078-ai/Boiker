import { AppDataProvider } from './hooks/useAppData';
import { useAppSession } from './hooks/useAppSession';
import { LandingPage } from './components/landing/LandingPage';
import { AuthPage } from './components/landing/AuthPage';
import { AppShell } from './components/AppShell';
import { useI18n } from './i18n';
import styles from './App.module.css';

export default function App() {
  const { t } = useI18n();
  const session = useAppSession();

  if (!session.ready) {
    return (
      <div className={styles.loading}>
        <p>{t('app.loading')}</p>
      </div>
    );
  }

  if (session.view === 'auth') {
    return <AuthPage onBack={session.openLanding} onSuccess={session.openApp} />;
  }

  if (session.view === 'landing') {
    return (
      <LandingPage
        signedIn={session.signedIn}
        onOpenAuth={session.openAuth}
        onOpenApp={session.openApp}
      />
    );
  }

  return (
    <AppDataProvider>
      <AppShell onBackToLanding={session.openLanding} onSignOut={() => void session.signOut()} />
    </AppDataProvider>
  );
}
