import { useState, type FormEvent } from 'react';
import { supabase } from '../../services/supabase';
import { authErrorText } from '../../services/authErrors';
import { saveProfileRole } from '../../services/profileRemote';
import { IT_ROLE_KEYS, IT_ROLES, isItRole, type ItRole } from '../../lib/itRoles';
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
  const [role, setRole] = useState('');
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

    let chosenRole: ItRole | null = null;
    if (mode === 'signup') {
      if (password.length < 6) {
        setError(t('auth.passwordMin'));
        return;
      }
      if (password !== confirm) {
        setError(t('auth.passwordMismatch'));
        return;
      }
      if (!isItRole(role)) {
        setError(t('auth.needRole'));
        return;
      }
      chosenRole = role;
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

      if (!chosenRole) {
        setError(t('auth.needRole'));
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { role: chosenRole },
        },
      });
      if (signUpError) {
        setError(authErrorText(signUpError, t));
        return;
      }
      if (data.session && data.user) {
        const saved = await saveProfileRole(data.user.id, chosenRole);
        if (!saved) {
          setError(t('auth.errorGeneric'));
          return;
        }
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
          {mode === 'signup' ? (
            <label className={styles.field}>
              {t('auth.role')}
              <select
                value={role}
                onChange={(event) => {
                  setRole(event.target.value);
                  setError('');
                }}
                required
              >
                <option value="">{t('auth.rolePlaceholder')}</option>
                {IT_ROLES.map((id) => (
                  <option key={id} value={id}>
                    {t(IT_ROLE_KEYS[id])}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
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
