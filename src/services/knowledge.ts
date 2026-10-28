import type { KnowledgeDoc } from '../types';
import { deleteKnowledgeDoc, putKnowledgeDoc } from './storage';

const EXCERPT_LEN = 500;

function uid(): string {
  return crypto.randomUUID();
}

export async function uploadKnowledgeFile(file: File): Promise<KnowledgeDoc> {
  const id = uid();
  const uploadedAt = new Date().toISOString();
  const lower = file.name.toLowerCase();

  let fullText = '';
  let textLimited = false;

  if (lower.endsWith('.md') || lower.endsWith('.txt') || file.type.startsWith('text/')) {
    fullText = await file.text();
  } else if (lower.endsWith('.pdf') || file.type === 'application/pdf') {
    fullText =
      '[PDF] Полный текст PDF ограничен в MVP. Загружен файл для справки по имени и метаданным.';
    textLimited = true;
  } else {
    try {
      fullText = await file.text();
    } catch {
      fullText = '[Не удалось извлечь текст из файла]';
      textLimited = true;
    }
  }

  const excerpt = fullText.slice(0, EXCERPT_LEN);

  const meta: KnowledgeDoc = {
    id,
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    uploadedAt,
    excerpt,
    textLimited,
  };

  await putKnowledgeDoc(meta, fullText);
  return meta;
}

export { deleteKnowledgeDoc };
