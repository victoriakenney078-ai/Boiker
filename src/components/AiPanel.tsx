import { useState } from 'react';
import type { AiDecompositionDraft, Priority, SuggestedTask } from '../types';
import { PRIORITY_LABELS } from '../types';
import { decomposeEpic } from '../services/ai';
import { getBacklogColumnId } from '../services/seed';
import { putTask } from '../services/storage';
import { useAppData } from '../hooks/useAppData';
import styles from './Panel.module.css';

interface Props {
  selectedDocIds: string[];
}

function now() {
  return new Date().toISOString();
}

export function AiPanel({ selectedDocIds }: Props) {
  const { users, refresh } = useAppData();
  const [epicTitle, setEpicTitle] = useState('');
  const [epicDescription, setEpicDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AiDecompositionDraft | null>(null);

  async function handleDecompose() {
    if (!epicTitle.trim()) {
      setError('Укажите название эпика');
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
      setError(e instanceof Error ? e.message : 'Не удалось разбить задачу');
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
      setError('Не найдена колонка «Бэклог»');
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
    window.alert('Эпик и задачи созданы в «Бэклог»');
  }

  const hasKey = Boolean(import.meta.env.VITE_OPENAI_API_KEY);

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>ИИ-постановка</h2>
      <p className={styles.muted}>
        {hasKey
          ? 'Используется OpenAI API из .env'
          : 'Ключ OpenAI не задан — работает локальное разбиение (fallback).'}
      </p>
      {selectedDocIds.length > 0 && (
        <p className={styles.hint}>В контексте ИИ: {selectedDocIds.length} док.</p>
      )}

      <label className={styles.labelBlock}>
        Название эпика
        <input value={epicTitle} onChange={(e) => setEpicTitle(e.target.value)} />
      </label>
      <label className={styles.labelBlock}>
        Описание
        <textarea
          rows={5}
          value={epicDescription}
          onChange={(e) => setEpicDescription(e.target.value)}
          placeholder="Большая задача, контекст, дедлайны…"
        />
      </label>

      <button
        type="button"
        className={styles.primaryBtn}
        disabled={loading}
        onClick={() => void handleDecompose()}
      >
        {loading ? 'Разбиваем…' : 'Разбить на задачи'}
      </button>

      {error && <p className={styles.error}>{error}</p>}

      {draft && (
        <div className={styles.preview}>
          <h3>Предпросмотр</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Название</th>
                <th>Описание</th>
                <th>Исполнитель</th>
                <th>Приоритет</th>
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
                      {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
                        <option key={p} value={p}>
                          {PRIORITY_LABELS[p]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className={styles.primaryBtn} onClick={() => void handleCreateOnBoard()}>
            Создать на доске
          </button>
        </div>
      )}
    </div>
  );
}
