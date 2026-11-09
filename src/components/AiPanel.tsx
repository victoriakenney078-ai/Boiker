import { useState } from 'react';
import type { Priority, SuggestedTask } from '../types';
import { PRIORITIES } from '../types';
import { createEpicOnBoard } from '../services/aiBoard';
import { useAppData } from '../hooks/useAppData';
import { useAiDecompose } from '../hooks/useAiDecompose';
import { PRIORITY_KEYS, useI18n } from '../i18n';
import styles from './Panel.module.css';

interface Props {
  selectedDocIds: string[];
}

export function AiPanel({ selectedDocIds }: Props) {
  const { users, refresh, activeBoardId } = useAppData();
  const { t } = useI18n();
  const { loading, error, setError, draft, setDraft, run } = useAiDecompose();
  const [epicTitle, setEpicTitle] = useState('');
  const [epicDescription, setEpicDescription] = useState('');

  async function handleDecompose() {
    if (!epicTitle.trim()) {
      setError(t('ai.errorTitle'));
      return;
    }
    try {
      await run({
        epicTitle: epicTitle.trim(),
        epicDescription: epicDescription.trim(),
        knowledgeDocIds: selectedDocIds,
      });
    } catch {
      /* error is stored in the hook */
    }
  }

  function updateSuggested(index: number, patch: Partial<SuggestedTask>) {
    if (!draft) return;
    const suggestedTasks = draft.suggestedTasks.map((task, i) =>
      i === index ? { ...task, ...patch } : task,
    );
    setDraft({ ...draft, suggestedTasks });
  }

  async function handleCreateOnBoard() {
    if (!draft || !activeBoardId) return;
    const result = await createEpicOnBoard(draft, activeBoardId);
    if (!result.ok) {
      setError(t('ai.errorBacklog'));
      return;
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
