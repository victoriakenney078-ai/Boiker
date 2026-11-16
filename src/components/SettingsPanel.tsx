import { useEffect, useState, type FormEvent } from 'react';
import { IT_ROLE_KEYS, IT_ROLES, isItRole } from '../lib/itRoles';
import { putSettings } from '../services/storage';
import { createTelegramLinkCode, fetchTelegramLinkStatus } from '../services/telegramLink';
import { fetchMyRole, notifyProfileRoleChanged, saveProfileRole } from '../services/profileRemote';
import { supabase } from '../services/supabase';
import { useAppData } from '../hooks/useAppData';
import { useI18n } from '../i18n';
import styles from './Panel.module.css';

export function SettingsPanel() {
  const { settings, refresh } = useAppData();
  const { t } = useI18n();
  const [projectName, setProjectName] = useState(settings.projectName);
  const [telegramSecret, setTelegramSecret] = useState(settings.telegramWebhookSecret ?? '');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [linkCode, setLinkCode] = useState('');
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
  const [linkPending, setLinkPending] = useState(false);

  useEffect(() => {
    setProjectName(settings.projectName);
    setTelegramSecret(settings.telegramWebhookSecret ?? '');
  }, [settings]);

  useEffect(() => {
    let active = true;
    void fetchMyRole().then((current) => {
      if (active && current) setRole(current);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void fetchTelegramLinkStatus().then((status) => {
      if (!active) return;
      setTelegramLinked(status.linked);
      setTelegramUsername(status.username);
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleTelegramLink() {
    setLinkPending(true);
    setLinkCode('');
    setError('');
    try {
      const result = await createTelegramLinkCode();
      if ('error' in result) {
        setError(t('settings.telegramLinkError'));
        return;
      }
      setLinkCode(result.code);
    } finally {
      setLinkPending(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!isItRole(role)) {
      setError(t('auth.needRole'));
      return;
    }

    await putSettings({
      projectName: projectName.trim() || t('settings.defaultProject'),
      openAiApiKeyConfigured: Boolean(import.meta.env.VITE_OPENAI_API_KEY),
      telegramWebhookSecret: telegramSecret.trim(),
    });

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setError(t('auth.errorGeneric'));
      await refresh();
      return;
    }

    const { error: metaError } = await supabase.auth.updateUser({ data: { role } });
    const saved = !metaError && (await saveProfileRole(userId, role));
    await refresh();
    if (!saved) {
      setError(t('auth.errorGeneric'));
      return;
    }

    notifyProfileRoleChanged();
    window.alert(t('settings.saved'));
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>{t('settings.title')}</h2>
      <form onSubmit={(e) => void handleSave(e)} className={styles.settingsForm}>
        <label className={styles.labelBlock}>
          {t('auth.role')}
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="">{t('auth.rolePlaceholder')}</option>
            {IT_ROLES.map((id) => (
              <option key={id} value={id}>
                {t(IT_ROLE_KEYS[id])}
              </option>
            ))}
          </select>
        </label>
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
        <p className={styles.muted}>{t('settings.aiServer')}</p>
        <section className={styles.telegramBlock} aria-labelledby="telegram-bot-settings">
          <h3 id="telegram-bot-settings" className={styles.subheading}>
            {t('settings.telegramBotTitle')}
          </h3>
          <p className={styles.muted}>
            {t('settings.telegramBotHandle')} · {t('settings.telegramBotLead')}
          </p>
          {telegramLinked ? (
            <p className={styles.hint}>
              {t('settings.telegramLinked', {
                username: telegramUsername
                  ? t('settings.telegramLinkedUser', { username: telegramUsername })
                  : '',
              })}
            </p>
          ) : null}
          {linkCode ? (
            <p className={styles.hint}>
              {t('settings.telegramLinkPending')}{' '}
              <code>{t('settings.telegramLinkCommand', { code: linkCode })}</code>
            </p>
          ) : null}
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={linkPending}
            onClick={() => void handleTelegramLink()}
          >
            {t('settings.telegramLinkGenerate')}
          </button>
        </section>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className={styles.primaryBtn}>
          {t('settings.save')}
        </button>
      </form>
    </div>
  );
}
