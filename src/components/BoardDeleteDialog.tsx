import { useEffect, useState } from 'react';
import type { Board } from '../types';
import { deleteBoard } from '../services/boardRemote';
import { boardErrorText } from '../services/boardErrors';
import { useI18n } from '../i18n';
import styles from './BoardFormModal.module.css';

interface Props {
  board: Board | null;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void | Promise<void>;
}

export function BoardDeleteDialog({ board, open, onClose, onDeleted }: Props) {
  const { t } = useI18n();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDeleting(false);
      setError(null);
    }
  }, [open, board?.id]);

  if (!open || !board) return null;

  function requestClose() {
    if (deleting) return;
    onClose();
  }

  async function handleDelete() {
    if (!board) return;
    setError(null);
    setDeleting(true);
    try {
      await deleteBoard(board.id);
      onClose();
      await onDeleted();
    } catch (err) {
      setError(boardErrorText(err, t));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={requestClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="board-delete-title"
        aria-describedby="board-delete-desc"
      >
        <header className={styles.modalHeader}>
          <h2 id="board-delete-title">{t('boards.delete')}</h2>
          <button
            type="button"
            className={styles.close}
            onClick={requestClose}
            disabled={deleting}
            aria-label={t('boards.close')}
          >
            ×
          </button>
        </header>
        <p id="board-delete-desc" className={styles.confirmText}>
          {t('boards.confirmDelete', { name: board.name })}
        </p>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.footer}>
          <button type="button" onClick={requestClose} disabled={deleting}>
            {t('boards.cancel')}
          </button>
          <button
            type="button"
            className={styles.danger}
            onClick={() => void handleDelete()}
            disabled={deleting}
          >
            {deleting ? t('boards.deleting') : t('boards.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
