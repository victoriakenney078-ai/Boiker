import { useRef, useState } from 'react';
import { deleteKnowledgeDoc, uploadKnowledgeFile } from '../services/knowledge';
import { getKnowledgeText } from '../services/storage';
import { useKnowledge } from '../hooks/useAppData';
import styles from './Panel.module.css';

interface Props {
  selectedForAi: string[];
  onToggleAiDoc: (id: string) => void;
}

export function KnowledgePanel({ selectedForAi, onToggleAiDoc }: Props) {
  const { knowledgeDocs, refresh } = useKnowledge();
  const inputRef = useRef<HTMLInputElement>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [viewText, setViewText] = useState('');
  const [dragOver, setDragOver] = useState(false);

  async function processFiles(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      await uploadKnowledgeFile(file);
    }
    await refresh();
  }

  async function openDoc(id: string) {
    const text = (await getKnowledgeText(id)) ?? '';
    setViewText(text);
    setViewId(id);
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Удалить «${name}»?`)) return;
    await deleteKnowledgeDoc(id);
    if (viewId === id) setViewId(null);
    await refresh();
  }

  function formatSize(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>База знаний</h2>
      <div
        className={`${styles.drop} ${dragOver ? styles.dropActive : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void processFiles(e.dataTransfer.files);
        }}
      >
        <p>Перетащите файлы (.md, .txt, .pdf) или</p>
        <button type="button" onClick={() => inputRef.current?.click()}>
          Выбрать файлы
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".md,.txt,.pdf,text/*"
          hidden
          onChange={(e) => void processFiles(e.target.files)}
        />
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>ИИ</th>
            <th>Имя</th>
            <th>Дата</th>
            <th>Размер</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {knowledgeDocs.map((doc) => (
            <tr key={doc.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedForAi.includes(doc.id)}
                  onChange={() => onToggleAiDoc(doc.id)}
                  title="Использовать в контексте ИИ"
                />
              </td>
              <td>
                <button type="button" className={styles.linkBtn} onClick={() => void openDoc(doc.id)}>
                  {doc.name}
                </button>
                {doc.textLimited && (
                  <span className={styles.warn} title="PDF — ограниченный текст">
                    PDF
                  </span>
                )}
              </td>
              <td>{new Date(doc.uploadedAt).toLocaleString('ru-RU')}</td>
              <td>{formatSize(doc.size)}</td>
              <td>
                <button type="button" onClick={() => void handleDelete(doc.id, doc.name)}>
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {knowledgeDocs.length === 0 && (
        <p className={styles.muted}>Документов пока нет. Загрузите markdown или текст.</p>
      )}

      {viewId && (
        <div className={styles.viewer}>
          <div className={styles.viewerHead}>
            <strong>Просмотр</strong>
            <button type="button" onClick={() => setViewId(null)}>
              Закрыть
            </button>
          </div>
          <pre className={styles.pre}>{viewText}</pre>
        </div>
      )}
    </div>
  );
}
