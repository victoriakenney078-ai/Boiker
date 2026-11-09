import { useEffect, useState } from 'react';
import type { Priority, Task, TaskSource, User } from '../types';
import { PRIORITIES } from '../types';
import { deleteTask, putTask } from '../services/storage';
import { isoNow } from '../lib/isoNow';
import { PRIORITY_KEYS, SOURCE_KEYS, useI18n } from '../i18n';
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

function emptyTask(columnId: string): Task {
  const ts = isoNow();
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
  const { t } = useI18n();
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
      window.alert(t('task.titleRequired'));
      return;
    }
    const labels = labelsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    await putTask({ ...draft, labels, updatedAt: isoNow() });
    onSaved();
    onClose();
  }

  async function handleDelete() {
    if (isNew) {
      onClose();
      return;
    }
    if (!window.confirm(t('task.confirmDelete'))) return;
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
          <h2 id="task-modal-title">{isNew ? t('task.newTask') : t('task.task')}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label={t('task.close')}>
            ×
          </button>
        </header>

        {parent && (
          <p className={styles.parentHint}>
            {t('task.epic')} <strong>{parent.title}</strong>
          </p>
        )}

        <label className={styles.field}>
          {t('task.title')}
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </label>

        <label className={styles.field}>
          {t('task.description')}
          <textarea
            rows={4}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </label>

        <div className={styles.row}>
          <label className={styles.field}>
            {t('task.assignee')}
            <select
              value={draft.assigneeId ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  assigneeId: e.target.value || null,
                })
              }
            >
              <option value="">{t('task.unassigned')}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            {t('task.priority')}
            <select
              value={draft.priority}
              onChange={(e) =>
                setDraft({ ...draft, priority: e.target.value as Priority })
              }
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {t(PRIORITY_KEYS[p])}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className={styles.field}>
          {t('task.labels')}
          <input value={labelsInput} onChange={(e) => setLabelsInput(e.target.value)} />
        </label>

        <p className={styles.meta}>
          {t('task.source', { source: t(SOURCE_KEYS[draft.source as TaskSource]) })}
        </p>

        <div className={styles.subtasks}>
          <h3>{t('task.subtasks')}</h3>
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
              placeholder={t('task.newSubtask')}
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addSubtask();
              }}
            />
            <button type="button" onClick={addSubtask}>
              {t('task.add')}
            </button>
          </div>
        </div>

        <footer className={styles.footer}>
          {!isNew && (
            <button type="button" className={styles.danger} onClick={() => void handleDelete()}>
              {t('task.delete')}
            </button>
          )}
          <div className={styles.footerRight}>
            <button type="button" onClick={onClose}>
              {t('task.cancel')}
            </button>
            <button type="button" className={styles.primary} onClick={() => void handleSave()}>
              {t('task.save')}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
