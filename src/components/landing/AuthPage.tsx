import { useState, type FormEvent } from 'react';
import { supabase } from '../../services/supabase';
import { authErrorText } from '../../services/authErrors';
import { useI18n } from '../../i18n';
import { LanguageSwitcher } from '../LanguageSwitcher';
import styles from './AuthPage.module.css';

interface Props {
  onBack: () => void;
  onSuccess: () => void;
}

type Mode = 'login' | 'signup';

export function AuthPage({ onBack, onSuccess }: Props) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [pending, setPending] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setInfo('');
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setInfo('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError(t('auth.needEmailPassword'));
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError(t('auth.passwordMin'));
        return;
      }
      if (password !== confirm) {
        setError(t('auth.passwordMismatch'));
        return;
      }
    }

    setPending(true);
    try {
      if (mode === 'login') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (signInError) {
          setError(authErrorText(signInError, t));
          return;
        }
        if (data.session) onSuccess();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (signUpError) {
        setError(authErrorText(signUpError, t));
        return;
      }
      if (data.session) {
        onSuccess();
        return;
      }
      setInfo(t('auth.checkEmail'));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.yellowStripe} aria-hidden />
      <header className={styles.nav}>
        <button type="button" className={styles.navLogo} onClick={onBack}>
          AivibeBoard
        </button>
        <LanguageSwitcher variant="landing" />
      </header>
      <main className={styles.main}>
        <form className={styles.card} noValidate onSubmit={(event) => void onSubmit(event)}>
          <p className={styles.eyebrow}>AivibeBoard</p>
          <h1>{mode === 'login' ? t('auth.login') : t('auth.signup')}</h1>
          <div className={styles.tabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? styles.tabActive : styles.tab}
              onClick={() => switchMode('login')}
            >
              {t('auth.login')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={mode === 'signup' ? styles.tabActive : styles.tab}
              onClick={() => switchMode('signup')}
            >
              {t('auth.signup')}
            </button>
          </div>
          <label className={styles.field}>
            {t('auth.email')}
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            {t('auth.password')}
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </label>
          {mode === 'signup' ? (
            <label className={styles.field}>
              {t('auth.confirmPassword')}
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
                minLength={6}
              />
            </label>
          ) : null}
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          {info ? <p className={styles.info}>{info}</p> : null}
          <button type="submit" className={styles.submit} disabled={pending}>
            {pending
              ? t('auth.pending')
              : mode === 'login'
                ? t('auth.submitLogin')
                : t('auth.submitSignup')}
          </button>
          <button type="button" className={styles.back} onClick={onBack}>
            {t('auth.backToSite')}
          </button>
        </form>
      </main>
    </div>
  );
}
