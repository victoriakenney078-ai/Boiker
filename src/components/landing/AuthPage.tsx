import { useState, type FormEvent } from 'react';
import type { AuthError } from '@supabase/supabase-js';
import { supabase } from '../../services/supabase';
import styles from './AuthPage.module.css';

interface Props {
  onBack: () => void;
  onSuccess: () => void;
}

type Mode = 'login' | 'signup';

function authErrorText(error: AuthError): string {
  const message = error.message.toLowerCase();
  if (error.status === 429 || message.includes('rate limit')) {
    return 'Слишком много попыток. Подождите немного и попробуйте снова.';
  }
  if (message.includes('invalid login credentials')) {
    return 'Неверный email или пароль.';
  }
  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'Пользователь с таким email уже зарегистрирован.';
  }
  if (message.includes('at least 6')) {
    return 'Пароль должен быть не короче 6 символов.';
  }
  if (message.includes('invalid') && message.includes('email')) {
    return 'Некорректный email.';
  }
  if (message.includes('email not confirmed')) {
    return 'Подтвердите email по ссылке из письма.';
  }
  if (message.includes('signup') && message.includes('disabled')) {
    return 'Регистрация сейчас отключена.';
  }
  return 'Не удалось выполнить запрос. Попробуйте ещё раз.';
}

export function AuthPage({ onBack, onSuccess }: Props) {
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
      setError('Введите email и пароль.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Пароль должен быть не короче 6 символов.');
        return;
      }
      if (password !== confirm) {
        setError('Пароли не совпадают.');
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
          setError(authErrorText(signInError));
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
        setError(authErrorText(signUpError));
        return;
      }
      if (data.session) {
        onSuccess();
        return;
      }
      setInfo('Проверьте почту — мы отправили ссылку для подтверждения. После перехода по ней откроется доска.');
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
      </header>
      <main className={styles.main}>
        <form className={styles.card} noValidate onSubmit={(event) => void onSubmit(event)}>
          <p className={styles.eyebrow}>AivibeBoard</p>
          <h1>{mode === 'login' ? 'Вход' : 'Регистрация'}</h1>
          <div className={styles.tabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? styles.tabActive : styles.tab}
              onClick={() => switchMode('login')}
            >
              Вход
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={mode === 'signup' ? styles.tabActive : styles.tab}
              onClick={() => switchMode('signup')}
            >
              Регистрация
            </button>
          </div>
          <label className={styles.field}>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            Пароль
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
              Повторите пароль
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
            {pending ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>
          <button type="button" className={styles.back} onClick={onBack}>
            Назад на сайт
          </button>
        </form>
      </main>
    </div>
  );
}
