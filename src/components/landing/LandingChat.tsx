import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { supabase } from '../../services/supabase';
import { useI18n } from '../../i18n';
import styles from './LandingChat.module.css';

interface Props {
  signedIn: boolean;
  onNeedAuth: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'aivibeboard.landingChat';
const MAX_TURNS = 20;
const SYSTEM_PROMPT =
  'You are the AivibeBoard assistant. Answer helpfully and briefly. Reply in the same language the user writes. Remember the full conversation you are given.';

function loadHistory(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ChatMessage =>
        !!item &&
        typeof item === 'object' &&
        (item.role === 'user' || item.role === 'assistant') &&
        typeof item.content === 'string' &&
        item.content.length > 0,
    );
  } catch {
    return [];
  }
}

export function LandingChat({ signedIn, onNeedAuth }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(loadHistory);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, open, pending]);

  function clearChat() {
    setMessages([]);
    setError('');
    sessionStorage.removeItem(STORAGE_KEY);
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    if (!signedIn) {
      onNeedAuth();
      return;
    }
    const text = draft.trim();
    if (!text || pending) return;

    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setDraft('');
    setError('');
    setPending(true);
    try {
      const history = next.slice(-MAX_TURNS);
      const { data, error: invokeError } = await supabase.functions.invoke('openrouter', {
        body: {
          temperature: 0.4,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
        },
      });
      const content = (
        data as { choices?: { message?: { content?: string } }[] } | null
      )?.choices?.[0]?.message?.content?.trim();
      if (invokeError || !content) {
        setError(t('landing.chatError'));
        return;
      }
      setMessages((current) => [...current, { role: 'assistant', content }]);
    } catch {
      setError(t('landing.chatError'));
    } finally {
      setPending(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  return (
    <div className={styles.dock}>
      {open ? (
        <section className={styles.panel} aria-label={t('landing.chatTitle')}>
          <header className={styles.head}>
            <strong>{t('landing.chatTitle')}</strong>
            <div className={styles.headActions}>
              <button type="button" className={styles.textBtn} onClick={clearChat}>
                {t('landing.chatClear')}
              </button>
              <button
                type="button"
                className={styles.textBtn}
                onClick={() => setOpen(false)}
                aria-label={t('landing.chatClose')}
              >
                ×
              </button>
            </div>
          </header>
          <div className={styles.list} ref={listRef}>
            {messages.length === 0 ? <p className={styles.empty}>{t('landing.chatEmpty')}</p> : null}
            {messages.map((message, index) => (
              <p
                key={`${message.role}-${index}`}
                className={message.role === 'user' ? styles.user : styles.assistant}
              >
                {message.content}
              </p>
            ))}
            {pending ? <p className={styles.pending}>{t('landing.chatPending')}</p> : null}
          </div>
          {!signedIn ? <p className={styles.hint}>{t('landing.chatNeedAuth')}</p> : null}
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <form className={styles.form} onSubmit={(event) => void send(event)}>
            <textarea
              className={styles.input}
              value={draft}
              rows={2}
              placeholder={t('landing.chatPlaceholder')}
              aria-label={t('landing.chatPlaceholder')}
              disabled={pending}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
            />
            <button type="submit" className={styles.send} disabled={pending || (signedIn && !draft.trim())}>
              {t('landing.chatSend')}
            </button>
          </form>
        </section>
      ) : null}
      <button
        type="button"
        className={styles.launcher}
        aria-expanded={open}
        aria-label={open ? t('landing.chatClose') : t('landing.chatOpen')}
        onClick={() => setOpen((value) => !value)}
      >
        {t('landing.chatTitle')}
      </button>
    </div>
  );
}
