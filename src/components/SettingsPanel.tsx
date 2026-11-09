import { useEffect, useState } from 'react';
import { putSettings } from '../services/storage';
import { useAppData } from '../hooks/useAppData';
import { useI18n } from '../i18n';
import styles from './Panel.module.css';

export function SettingsPanel() {
  const { settings, refresh } = useAppData();
  const { t } = useI18n();
  const [projectName, setProjectName] = useState(settings.projectName);
  const [telegramSecret, setTelegramSecret] = useState(settings.telegramWebhookSecret ?? '');

  useEffect(() => {
    setProjectName(settings.projectName);
    setTelegramSecret(settings.telegramWebhookSecret ?? '');
  }, [settings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await putSettings({
      projectName: projectName.trim() || t('settings.defaultProject'),
      openAiApiKeyConfigured: Boolean(import.meta.env.VITE_OPENAI_API_KEY),
      telegramWebhookSecret: telegramSecret.trim(),
    });
    await refresh();
    window.alert(t('settings.saved'));
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>{t('settings.title')}</h2>
      <form onSubmit={(e) => void handleSave(e)} className={styles.settingsForm}>
        <label className={styles.labelBlock}>
          {t('settings.projectName')}
          <input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
        </label>
        <label className={styles.labelBlock}>
          {t('settings.telegramSecret')}
          <input
            value={telegramSecret}
            onChange={(e) => setTelegramSecret(e.target.value)}
            placeholder={t('settings.telegramPlaceholder')}
          />
        </label>
        <p className={styles.muted}>
          {t('settings.openaiHintBefore')} <code>.env</code> {t('settings.openaiHintMid')}{' '}
          <code>VITE_OPENAI_API_KEY</code>. {t('settings.openaiHintAfter')}{' '}
          <code>npm run dev</code>.
        </p>
        <p className={styles.muted}>
          {t('settings.model')} <code>{import.meta.env.VITE_OPENAI_MODEL ?? 'gpt-4o-mini'}</code>
          {' · '}
          {t('settings.key')}{' '}
          {import.meta.env.VITE_OPENAI_API_KEY ? t('settings.keySet') : t('settings.keyMissing')}
        </p>
        <button type="submit" className={styles.primaryBtn}>
          {t('settings.save')}
        </button>
      </form>
    </div>
  );
}
