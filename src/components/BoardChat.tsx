import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { User } from '../types';
import { decomposeGlobalTask } from '../services/ai';
import { createEpicOnBoard } from '../services/aiBoard';
import { useI18n } from '../i18n';
import styles from './BoardChat.module.css';

interface Props {
  boardId: string;
  members: User[];
  onCreated: () => Promise<void>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function BoardChat({ boardId, members, onCreated }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, open, pending]);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || pending) return;

    setMessages((current) => [...current, { role: 'user', content: text }]);
    setDraft('');
    setError('');
    setPending(true);
    try {
      const result = await decomposeGlobalTask(text, members);
      const created = await createEpicOnBoard(result, boardId);
      if (!created.ok) {
        setError(t('boardChat.noBacklog'));
        return;
      }
      const lines = result.suggestedTasks.map((task) => {
        const name =
          members.find((user) => user.id === task.suggestedAssigneeId)?.name ??
          t('boardChat.unassigned');
        return `${task.title} — ${name}`;
      });
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: `${t('boardChat.created', { count: result.suggestedTasks.length })}\n${lines.join('\n')}`,
        },
      ]);
      setPending(false);
      await onCreated();
    } catch {
      setError(t('boardChat.error'));
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
        <section className={styles.panel} aria-label={t('boardChat.title')}>
          <header className={styles.head}>
            <strong>{t('boardChat.title')}</strong>
            <button
              type="button"
              className={styles.textBtn}
              onClick={() => setOpen(false)}
              aria-label={t('boardChat.close')}
            >
              ×
            </button>
          </header>
          <div className={styles.list} ref={listRef}>
            {messages.length === 0 ? <p className={styles.empty}>{t('boardChat.empty')}</p> : null}
            {messages.map((message, index) => (
              <p
                key={`${message.role}-${index}`}
                className={message.role === 'user' ? styles.user : styles.assistant}
              >
                {message.content}
              </p>
            ))}
            {pending ? <p className={styles.pending}>{t('boardChat.pending')}</p> : null}
          </div>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <form className={styles.form} onSubmit={(event) => void send(event)}>
            <textarea
              className={styles.input}
              value={draft}
              rows={3}
              placeholder={t('boardChat.placeholder')}
              aria-label={t('boardChat.placeholder')}
              disabled={pending}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
            />
            <button type="submit" className={styles.send} disabled={pending || !draft.trim()}>
              {t('boardChat.send')}
            </button>
          </form>
        </section>
      ) : null}
      <button
        type="button"
        className={styles.launcher}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? t('boardChat.close') : t('boardChat.open')}
      </button>
    </div>
  );
}
