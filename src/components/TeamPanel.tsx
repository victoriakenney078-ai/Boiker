import { useState } from 'react';
import type { User } from '../types';
import { deleteUser, putUser } from '../services/storage';
import { useAppData } from '../hooks/useAppData';
import { useI18n } from '../i18n';
import styles from './Panel.module.css';

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444'];

export function TeamPanel() {
  const { users, refresh } = useAppData();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [telegram, setTelegram] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const user: User = {
      id: crypto.randomUUID(),
      name: name.trim(),
      avatarColor: COLORS[users.length % COLORS.length],
      telegramUsername: telegram.replace(/^@/, '').trim() || undefined,
    };
    await putUser(user);
    setName('');
    setTelegram('');
    await refresh();
  }

  async function handleDelete(user: User) {
    if (!window.confirm(t('team.confirmDelete', { name: user.name }))) return;
    await deleteUser(user.id);
    await refresh();
  }

  async function handleEdit(user: User) {
    const newName = window.prompt(t('team.promptName'), user.name);
    if (!newName?.trim()) return;
    const tg = window.prompt(t('team.promptTelegram'), user.telegramUsername ?? '') ?? '';
    await putUser({
      ...user,
      name: newName.trim(),
      telegramUsername: tg.replace(/^@/, '').trim() || undefined,
    });
    await refresh();
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>{t('team.title')}</h2>
      <form className={styles.form} onSubmit={(e) => void handleAdd(e)}>
        <input
          placeholder={t('team.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          placeholder={t('team.telegramOptional')}
          value={telegram}
          onChange={(e) => setTelegram(e.target.value)}
        />
        <button type="submit">{t('team.add')}</button>
      </form>
      <ul className={styles.list}>
        {users.map((u) => (
          <li key={u.id} className={styles.listItem}>
            <span
              className={styles.avatar}
              style={{ background: u.avatarColor ?? '#94a3b8' }}
            >
              {u.name.charAt(0)}
            </span>
            <div className={styles.listBody}>
              <strong>{u.name}</strong>
              {u.telegramUsername && (
                <span className={styles.muted}>@{u.telegramUsername}</span>
              )}
            </div>
            <div className={styles.listActions}>
              <button type="button" onClick={() => void handleEdit(u)}>
                {t('team.edit')}
              </button>
              <button type="button" onClick={() => void handleDelete(u)}>
                {t('team.delete')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
