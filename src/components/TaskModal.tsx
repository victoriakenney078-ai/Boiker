import { useEffect, useState } from 'react';
import type { Priority, Task, TaskSource, User } from '../types';
import { PRIORITY_LABELS, SOURCE_LABELS } from '../types';
import { deleteTask, putTask } from '../services/storage';
import styles from './TaskModal.module.css';

interface Props {
  task: Task | null;
  users: User[];
  tasks: Task[];
  defaultColumnId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function now() {
  return new Date().toISOString();
}

function emptyTask(columnId: string): Task {
  const ts = now();
  return {
    id: crypto.randomUUID(),
    columnId,
    title: '',
    description: '',
    assigneeId: null,
    priority: 'medium',
    labels: [],
    subtasks: [],
    parentTaskId: null,
    source: 'manual',
    createdAt: ts,
    updatedAt: ts,
  };
}

export function TaskModal({
  task,
  users,
  tasks,
  defaultColumnId,
  open,
  onClose,
  onSaved,
}: Props) {
  const [draft, setDraft] = useState<Task>(() => emptyTask(defaultColumnId));
  const [labelsInput, setLabelsInput] = useState('');
  const [newSubtask, setNewSubtask] = useState('');

  useEffect(() => {
    if (open) {
      if (task) {
        setDraft({ ...task });
        setLabelsInput(task.labels.join(', '));
      } else {
        setDraft(emptyTask(defaultColumnId));
        setLabelsInput('');
      }
      setNewSubtask('');
    }
  }, [open, task, defaultColumnId]);

  if (!open) return null;

  const isNew = !task;
  const parent = draft.parentTaskId
    ? tasks.find((t) => t.id === draft.parentTaskId)
    : undefined;

  async function handleSave() {
    if (!draft.title.trim()) {
      window.alert('Укажите название задачи');
      return;
    }
    const labels = labelsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    await putTask({ ...draft, labels, updatedAt: now() });
    onSaved();
    onClose();
  }

  async function handleDelete() {
    if (isNew) {
      onClose();
      return;
    }
    if (!window.confirm('Удалить задачу?')) return;
    await deleteTask(draft.id);
    onSaved();
    onClose();
  }

  function addSubtask() {
    if (!newSubtask.trim()) return;
    setDraft((d) => ({
      ...d,
      subtasks: [
        ...d.subtasks,
        { id: crypto.randomUUID(), title: newSubtask.trim(), done: false },
      ],
    }));
    setNewSubtask('');
  }

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
      >
        <header className={styles.header}>
          <h2 id="task-modal-title">{isNew ? 'Новая задача' : 'Задача'}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </header>

        {parent && (
          <p className={styles.parentHint}>
            Эпик: <strong>{parent.title}</strong>
          </p>
        )}

        <label className={styles.field}>
          Название
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </label>

        <label className={styles.field}>
          Описание
          <textarea
            rows={4}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </label>

        <div className={styles.row}>
          <label className={styles.field}>
            Исполнитель
            <select
              value={draft.assigneeId ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  assigneeId: e.target.value || null,
                })
              }
            >
              <option value="">Не назначен</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            Приоритет
            <select
              value={draft.priority}
              onChange={(e) =>
                setDraft({ ...draft, priority: e.target.value as Priority })
              }
            >
              {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className={styles.field}>
          Метки (через запятую)
          <input value={labelsInput} onChange={(e) => setLabelsInput(e.target.value)} />
        </label>

        <p className={styles.meta}>
          Источник: {SOURCE_LABELS[draft.source as TaskSource]}
        </p>

        <div className={styles.subtasks}>
          <h3>Подзадачи</h3>
          <ul>
            {draft.subtasks.map((st) => (
              <li key={st.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={st.done}
                    onChange={() =>
                      setDraft({
                        ...draft,
                        subtasks: draft.subtasks.map((s) =>
                          s.id === st.id ? { ...s, done: !s.done } : s,
                        ),
                      })
                    }
                  />
                  {st.title}
                </label>
              </li>
            ))}
          </ul>
          <div className={styles.subtaskAdd}>
            <input
              placeholder="Новая подзадача"
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addSubtask();
              }}
            />
            <button type="button" onClick={addSubtask}>
              Добавить
            </button>
          </div>
        </div>

        <footer className={styles.footer}>
          {!isNew && (
            <button type="button" className={styles.danger} onClick={() => void handleDelete()}>
              Удалить
            </button>
          )}
          <div className={styles.footerRight}>
            <button type="button" onClick={onClose}>
              Отмена
            </button>
            <button type="button" className={styles.primary} onClick={() => void handleSave()}>
              Сохранить
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
