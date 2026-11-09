import { useState } from 'react';
import type { Task, TelegramInbound } from '../types';
import { getBacklogColumnId } from '../services/seed';
import { putTask } from '../services/storage';
import { simulateTelegramMessage, updateTelegramItem } from '../services/telegram';
import { useAppData } from '../hooks/useAppData';
import { useI18n } from '../i18n';
import styles from './Panel.module.css';

function now() {
  return new Date().toISOString();
}

export function TelegramInbox() {
  const { telegram, tasks, refresh } = useAppData();
  const { t, dateLocale } = useI18n();
  const [linkTaskId, setLinkTaskId] = useState<string>('');

  async function handleSimulate() {
    await simulateTelegramMessage();
    await refresh();
  }

  async function createTaskFrom(item: TelegramInbound) {
    const backlogId = await getBacklogColumnId();
    if (!backlogId) {
      window.alert(t('telegram.noBacklog'));
      return;
    }
    const ts = now();
    const title =
      item.text.length > 80 ? `${item.text.slice(0, 77)}…` : item.text;
    const taskId = crypto.randomUUID();
    const task: Task = {
      id: taskId,
      columnId: backlogId,
      title,
      description: item.text,
      assigneeId: null,
      priority: 'medium',
      labels: ['Telegram'],
      subtasks: [],
      parentTaskId: null,
      source: 'telegram',
      createdAt: ts,
      updatedAt: ts,
    };
    await putTask(task);
    await updateTelegramItem({
      ...item,
      processed: true,
      linkedTaskId: taskId,
    });
    await refresh();
  }

  async function markProcessed(item: TelegramInbound) {
    await updateTelegramItem({ ...item, processed: true });
    await refresh();
  }

  async function linkExisting(item: TelegramInbound) {
    if (!linkTaskId) return;
    await updateTelegramItem({
      ...item,
      processed: true,
      linkedTaskId: linkTaskId,
    });
    setLinkTaskId('');
    await refresh();
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>{t('telegram.title')}</h2>
      <p className={styles.muted}>{t('telegram.lead')}</p>
      <button type="button" className={styles.primaryBtn} onClick={() => void handleSimulate()}>
        {t('telegram.simulate')}
      </button>

      <ul className={styles.inbox}>
        {telegram.map((item) => (
          <li key={item.id} className={item.processed ? styles.processed : ''}>
            <div className={styles.inboxMeta}>
              <span>{item.fromUsername ? `@${item.fromUsername}` : item.chatId}</span>
              <span>{new Date(item.receivedAt).toLocaleString(dateLocale)}</span>
            </div>
            <p className={styles.inboxText}>{item.text}</p>
            {item.linkedTaskId && (
              <p className={styles.hint}>
                {t('telegram.linkedTo')}{' '}
                {tasks.find((t) => t.id === item.linkedTaskId)?.title ?? item.linkedTaskId}
              </p>
            )}
            {!item.processed && (
              <div className={styles.inboxActions}>
                <button type="button" onClick={() => void createTaskFrom(item)}>
                  {t('telegram.createTask')}
                </button>
                <button type="button" onClick={() => void markProcessed(item)}>
                  {t('telegram.processed')}
                </button>
                <select
                  value={linkTaskId}
                  onChange={(e) => setLinkTaskId(e.target.value)}
                  aria-label={t('telegram.linkAria')}
                >
                  <option value="">{t('telegram.linkToTask')}</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!linkTaskId}
                  onClick={() => void linkExisting(item)}
                >
                  {t('telegram.link')}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
