import { useState } from 'react';
import type { TelegramInbound } from '../types';
import {
  createTaskFromInbound,
  simulateTelegramMessage,
  updateTelegramItem,
} from '../services/telegram';
import { useAppData } from '../hooks/useAppData';
import { useI18n } from '../i18n';
import styles from './Panel.module.css';

export function TelegramInbox() {
  const { telegram, tasks, refresh, activeBoardId } = useAppData();
  const { t, dateLocale } = useI18n();
  const [linkTaskId, setLinkTaskId] = useState('');

  async function handleSimulate() {
    await simulateTelegramMessage();
    await refresh();
  }

  async function createTaskFrom(item: TelegramInbound) {
    if (!activeBoardId) {
      window.alert(t('telegram.noBacklog'));
      return;
    }
    const taskId = await createTaskFromInbound(item, activeBoardId);
    if (!taskId) {
      window.alert(t('telegram.noBacklog'));
      return;
    }
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
                {tasks.find((task) => task.id === item.linkedTaskId)?.title ?? item.linkedTaskId}
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
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
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
