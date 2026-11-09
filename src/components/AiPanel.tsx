import { useState } from 'react';
import type { AiDecompositionDraft, Priority, SuggestedTask } from '../types';
import { PRIORITIES } from '../types';
import { decomposeEpic } from '../services/ai';
import { getBacklogColumnId } from '../services/seed';
import { putTask } from '../services/storage';
import { useAppData } from '../hooks/useAppData';
import { useI18n } from '../i18n';
import type { MessageKey } from '../i18n';
import styles from './Panel.module.css';

const PRIORITY_KEYS: Record<Priority, MessageKey> = {
  low: 'priority.low',
  medium: 'priority.medium',
  high: 'priority.high',
  critical: 'priority.critical',
};

interface Props {
  selectedDocIds: string[];
}

function now() {
  return new Date().toISOString();
}

export function AiPanel({ selectedDocIds }: Props) {
  const { users, refresh } = useAppData();
  const { t } = useI18n();
  const [epicTitle, setEpicTitle] = useState('');
  const [epicDescription, setEpicDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AiDecompositionDraft | null>(null);

  async function handleDecompose() {
    if (!epicTitle.trim()) {
      setError(t('ai.errorTitle'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await decomposeEpic({
        epicTitle: epicTitle.trim(),
        epicDescription: epicDescription.trim(),
        users,
        knowledgeDocIds: selectedDocIds,
      });
      setDraft(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('ai.errorGeneric'));
    } finally {
      setLoading(false);
    }
  }

  function updateSuggested(index: number, patch: Partial<SuggestedTask>) {
    if (!draft) return;
    const suggestedTasks = draft.suggestedTasks.map((t, i) =>
      i === index ? { ...t, ...patch } : t,
    );
    setDraft({ ...draft, suggestedTasks });
  }

  async function handleCreateOnBoard() {
    if (!draft) return;
    const backlogId = await getBacklogColumnId();
    if (!backlogId) {
      setError(t('ai.errorBacklog'));
      return;
    }
    const ts = now();
    const epicId = crypto.randomUUID();
    await putTask({
      id: epicId,
      columnId: backlogId,
      title: draft.epicTitle,
      description: draft.epicDescription,
      assigneeId: null,
      priority: 'high',
      labels: ['Эпик'],
      subtasks: [],
      parentTaskId: null,
      source: 'ai',
      createdAt: ts,
      updatedAt: ts,
    });

    for (const st of draft.suggestedTasks) {
      const t = now();
      await putTask({
        id: crypto.randomUUID(),
        columnId: backlogId,
        title: st.title,
        description: st.description,
        assigneeId: st.suggestedAssigneeId,
        priority: st.priority,
        labels: [],
        subtasks: [],
        parentTaskId: epicId,
        source: 'ai',
        createdAt: t,
        updatedAt: t,
      });
    }

    setDraft(null);
    setEpicTitle('');
    setEpicDescription('');
    await refresh();
    window.alert(t('ai.createdAlert'));
  }

  const hasKey = Boolean(import.meta.env.VITE_OPENAI_API_KEY);

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>{t('ai.title')}</h2>
      <p className={styles.muted}>{hasKey ? t('ai.hasKey') : t('ai.noKey')}</p>
      {selectedDocIds.length > 0 && (
        <p className={styles.hint}>{t('ai.contextDocs', { n: selectedDocIds.length })}</p>
      )}

      <label className={styles.labelBlock}>
        {t('ai.epicTitle')}
        <input value={epicTitle} onChange={(e) => setEpicTitle(e.target.value)} />
      </label>
      <label className={styles.labelBlock}>
        {t('ai.description')}
        <textarea
          rows={5}
          value={epicDescription}
          onChange={(e) => setEpicDescription(e.target.value)}
          placeholder={t('ai.descriptionPlaceholder')}
        />
      </label>

      <button
        type="button"
        className={styles.primaryBtn}
        disabled={loading}
        onClick={() => void handleDecompose()}
      >
        {loading ? t('ai.decomposing') : t('ai.decompose')}
      </button>

      {error && <p className={styles.error}>{error}</p>}

      {draft && (
        <div className={styles.preview}>
          <h3>{t('ai.preview')}</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('ai.colTitle')}</th>
                <th>{t('ai.colDescription')}</th>
                <th>{t('ai.colAssignee')}</th>
                <th>{t('ai.colPriority')}</th>
              </tr>
            </thead>
            <tbody>
              {draft.suggestedTasks.map((st, i) => (
                <tr key={i}>
                  <td>
                    <input
                      value={st.title}
                      onChange={(e) => updateSuggested(i, { title: e.target.value })}
                    />
                  </td>
                  <td>
                    <textarea
                      rows={2}
                      value={st.description}
                      onChange={(e) => updateSuggested(i, { description: e.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      value={st.suggestedAssigneeId ?? ''}
                      onChange={(e) =>
                        updateSuggested(i, {
                          suggestedAssigneeId: e.target.value || null,
                        })
                      }
                    >
                      <option value="">—</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={st.priority}
                      onChange={(e) =>
                        updateSuggested(i, { priority: e.target.value as Priority })
                      }
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {t(PRIORITY_KEYS[p])}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className={styles.primaryBtn} onClick={() => void handleCreateOnBoard()}>
            {t('ai.createOnBoard')}
          </button>
        </div>
      )}
    </div>
  );
}
