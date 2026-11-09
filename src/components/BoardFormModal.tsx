import { useEffect, useState, type FormEvent } from 'react';
import type { Board, User } from '../types';
import { isoNow } from '../lib/isoNow';
import { createBoardWithColumns, putBoard } from '../services/boardRemote';
import { boardErrorText } from '../services/boardErrors';
import { useI18n } from '../i18n';
import styles from './BoardFormModal.module.css';

type Mode = 'create' | 'edit';

interface Props {
  open: boolean;
  mode: Mode;
  board: Board | null;
  users: User[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

export function BoardFormModal({ open, mode, board, users, onClose, onSaved }: Props) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSaving(false);
    setError(null);
    setNameError(null);
    if (mode === 'edit' && board) {
      setName(board.name);
      setDescription(board.description);
      setMemberIds(board.memberIds);
    } else {
      setName('');
      setDescription('');
      setMemberIds([]);
    }
  }, [open, mode, board]);

  if (!open) return null;

  function requestClose() {
    if (saving) return;
    onClose();
  }

  function toggleMember(id: string) {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t('boards.nameRequired'));
      return;
    }
    setNameError(null);
    setError(null);
    setSaving(true);
    try {
      if (mode === 'create') {
        await createBoardWithColumns(trimmed, description, memberIds);
      } else if (board) {
        await putBoard({
          ...board,
          name: trimmed,
          description: description.trim(),
          memberIds,
          updatedAt: isoNow(),
        });
      }
      onClose();
      await onSaved();
    } catch (err) {
      setError(boardErrorText(err, t));
    } finally {
      setSaving(false);
    }
  }

  const title = mode === 'create' ? t('boards.create') : t('boards.editTitle');
  const submitLabel = saving ? t('boards.saving') : mode === 'create' ? t('boards.create') : t('boards.save');

  return (
    <div className={styles.backdrop} onClick={requestClose} role="presentation">
      <form
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => void handleSubmit(event)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="board-form-title"
      >
        <header className={styles.modalHeader}>
          <h2 id="board-form-title">{title}</h2>
          <button
            type="button"
            className={styles.close}
            onClick={requestClose}
            disabled={saving}
            aria-label={t('boards.close')}
          >
            ×
          </button>
        </header>
        <label className={styles.field}>
          {t('boards.name')}
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder={t('boards.namePlaceholder')}
            disabled={saving}
            autoFocus
            aria-invalid={nameError ? true : undefined}
          />
          {nameError ? <span className={styles.fieldError}>{nameError}</span> : null}
        </label>
        <label className={styles.field}>
          {t('boards.description')}
          <textarea
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t('boards.descriptionPlaceholder')}
            disabled={saving}
          />
        </label>
        <fieldset className={styles.membersField} disabled={saving}>
          <legend>{t('boards.members')}</legend>
          {users.length === 0 ? (
            <p className={styles.hint}>{t('boards.noMembers')}</p>
          ) : (
            <ul className={styles.memberList}>
              {users.map((user) => (
                <li key={user.id}>
                  <label className={styles.memberOption}>
                    <input
                      type="checkbox"
                      checked={memberIds.includes(user.id)}
                      onChange={() => toggleMember(user.id)}
                      disabled={saving}
                    />
                    <span className={styles.avatar} style={{ background: user.avatarColor ?? '#94a3b8' }}>
                      {user.name.charAt(0)}
                    </span>
                    {user.name}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.footer}>
          <button type="button" onClick={requestClose} disabled={saving}>
            {t('boards.cancel')}
          </button>
          <button type="submit" className={styles.primary} disabled={saving}>
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
