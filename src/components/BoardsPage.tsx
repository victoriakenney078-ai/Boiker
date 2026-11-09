import { useState } from 'react';
import type { Board } from '../types';
import { useAppData } from '../hooks/useAppData';
import { useI18n } from '../i18n';
import { BoardDeleteDialog } from './BoardDeleteDialog';
import { BoardFormModal } from './BoardFormModal';
import styles from './BoardsPage.module.css';

interface Props {
  onOpen: (boardId: string) => void;
}

export function BoardsPage({ onOpen }: Props) {
  const { boards, columns, tasks, users, refresh } = useAppData();
  const { t } = useI18n();
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Board | null>(null);

  function openCreate() {
    setFormMode('create');
    setEditingBoard(null);
    setFormOpen(true);
  }

  function openEdit(board: Board) {
    setFormMode('edit');
    setEditingBoard(board);
    setFormOpen(true);
  }

  function openDelete(board: Board) {
    setDeleteTarget(board);
  }

  return (
    <section className={styles.page}>
      <div className={styles.heading}>
        <h1 className={styles.title}>{t('boards.title')}</h1>
        <button type="button" className={styles.create} onClick={openCreate}>
          {t('boards.create')}
        </button>
      </div>
      {boards.length === 0 ? (
        <p className={styles.empty}>{t('boards.empty')}</p>
      ) : (
        <ul className={styles.grid}>
          {boards.map((board) => {
            const columnCount = columns.filter((column) => column.boardId === board.id).length;
            const taskCount = tasks.filter((task) => task.boardId === board.id).length;
            const members = users.filter((user) => board.memberIds.includes(user.id));
            return (
              <li key={board.id}>
                <article className={styles.card}>
                  <button
                    type="button"
                    className={styles.summary}
                    onClick={() => onOpen(board.id)}
                  >
                    <span className={styles.name}>{board.name}</span>
                    {board.description ? (
                      <span className={styles.description}>{board.description}</span>
                    ) : null}
                    {members.length > 0 ? (
                      <span className={styles.members}>
                        {members.map((user) => (
                          <span
                            key={user.id}
                            className={styles.avatar}
                            style={{ background: user.avatarColor ?? '#94a3b8' }}
                            title={user.name}
                          >
                            {user.name.charAt(0)}
                          </span>
                        ))}
                        <span className={styles.memberNames}>
                          {members.map((user) => user.name).join(', ')}
                        </span>
                      </span>
                    ) : null}
                    <span className={styles.stats}>
                      {t('boards.columnCount', { count: columnCount })}
                      {' · '}
                      {t('boards.taskCount', { count: taskCount })}
                    </span>
                  </button>
                  <div className={styles.actions}>
                    <button type="button" className={styles.open} onClick={() => onOpen(board.id)}>
                      {t('boards.open')}
                    </button>
                    <button type="button" onClick={() => openEdit(board)}>
                      {t('boards.edit')}
                    </button>
                    <button type="button" className={styles.danger} onClick={() => openDelete(board)}>
                      {t('boards.delete')}
                    </button>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
      <BoardFormModal
        open={formOpen}
        mode={formMode}
        board={editingBoard}
        users={users}
        onClose={() => setFormOpen(false)}
        onSaved={() => refresh()}
      />
      <BoardDeleteDialog
        board={deleteTarget}
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => refresh()}
      />
    </section>
  );
}
