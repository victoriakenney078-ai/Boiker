import { useEffect, useState } from 'react';
import { putSettings } from '../services/storage';
import { useAppData } from '../hooks/useAppData';
import styles from './Panel.module.css';

export function SettingsPanel() {
  const { settings, refresh } = useAppData();
  const [projectName, setProjectName] = useState(settings.projectName);
  const [telegramSecret, setTelegramSecret] = useState(settings.telegramWebhookSecret ?? '');

  useEffect(() => {
    setProjectName(settings.projectName);
    setTelegramSecret(settings.telegramWebhookSecret ?? '');
  }, [settings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await putSettings({
      projectName: projectName.trim() || 'Демо',
      openAiApiKeyConfigured: Boolean(import.meta.env.VITE_OPENAI_API_KEY),
      telegramWebhookSecret: telegramSecret.trim(),
    });
    await refresh();
    window.alert('Настройки сохранены');
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Настройки</h2>
      <form onSubmit={(e) => void handleSave(e)} className={styles.settingsForm}>
        <label className={styles.labelBlock}>
          Имя проекта
          <input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
        </label>
        <label className={styles.labelBlock}>
          Секрет Telegram webhook
          <input
            value={telegramSecret}
            onChange={(e) => setTelegramSecret(e.target.value)}
            placeholder="Совпадает с secret в POST теле"
          />
        </label>
        <p className={styles.muted}>
          Ключ OpenAI задаётся в файле <code>.env</code> как{' '}
          <code>VITE_OPENAI_API_KEY</code>. После изменения перезапустите{' '}
          <code>npm run dev</code>.
        </p>
        <p className={styles.muted}>
          Модель: <code>{import.meta.env.VITE_OPENAI_MODEL ?? 'gpt-4o-mini'}</code>
          {' · '}
          Ключ: {import.meta.env.VITE_OPENAI_API_KEY ? 'задан' : 'не задан'}
        </p>
        <button type="submit" className={styles.primaryBtn}>
          Сохранить
        </button>
      </form>
    </div>
  );
}
