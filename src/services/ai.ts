import { isItRole, type ItRole } from '../lib/itRoles';
import type { AiDecompositionDraft, Priority, SuggestedTask, User } from '../types';
import { getKnowledgeText } from './storage';
import { supabase } from './supabase';

const SYSTEM_PROMPT = `You are an experienced project manager. Break the epic into 3-12 concrete actionable tasks.
Return ONLY valid JSON with this shape:
{"tasks":[{"title":"string","description":"string","priority":"low|medium|high|critical","assigneeName":"string or empty"}]}
Use assignee names exactly from the provided team list when possible. Priorities must be one of: low, medium, high, critical.`;

const ROLE_SYSTEM_PROMPT = `You are an experienced project manager. Break the epic into 3-12 concrete actionable tasks.
Assign each task to the team member whose role best fits the work.
Return ONLY valid JSON with this shape:
{"tasks":[{"title":"string","description":"string","priority":"low|medium|high|critical","assigneeName":"string"}]}
Copy assigneeName exactly from the team list. Priorities must be one of: low, medium, high, critical.`;

const ROLE_HINTS: Record<ItRole, string[]> = {
  productManager: ['продукт', 'roadmap', 'приоритет', 'product', 'vision'],
  projectManager: ['срок', 'план', 'координац', 'project', 'milestone'],
  businessAnalyst: ['требован', 'анализ', 'спецификац', 'бизнес', 'requirement'],
  scrumMaster: ['спринт', 'ретро', 'стендап', 'scrum', 'agile'],
  techLead: ['архитектур', 'ревью', 'техлид', 'architecture'],
  frontend: ['интерфейс', 'вёрст', 'верст', 'экран', 'кнопк', 'frontend', 'react', 'ui'],
  backend: ['api', 'сервер', 'база', 'backend', 'endpoint'],
  fullstack: ['fullstack', 'полный цикл'],
  mobile: ['мобил', 'ios', 'android', 'mobile'],
  qa: ['тест', 'баг', 'провер', 'qa'],
  devops: ['деплой', 'ci', 'docker', 'инфра', 'devops'],
  designer: ['дизайн', 'макет', 'ux', 'прототип'],
  dataAnalyst: ['данн', 'метрик', 'отчёт', 'отчет', 'аналитик'],
  sysadmin: ['доступ', 'админ', 'учетн', 'учётн', 'sysadmin'],
};

function assigneeForText(text: string, users: User[], index: number): string | null {
  const hay = text.toLowerCase();
  const matched = users.find(
    (user) => user.role && ROLE_HINTS[user.role].some((hint) => hay.includes(hint)),
  );
  if (matched) return matched.id;
  return users.length ? users[index % users.length]!.id : null;
}

function resolveAssignee(name: string, text: string, users: User[], index: number): string | null {
  const normalized = name.trim().toLowerCase();
  const byName = users.find((user) => user.name.toLowerCase() === normalized);
  if (byName) return byName.id;
  if (isItRole(name.trim())) {
    const byRole = users.find((user) => user.role === name.trim());
    if (byRole) return byRole.id;
  }
  return assigneeForText(text, users, index);
}

function uid(): string {
  return crypto.randomUUID();
}

function parsePriority(p: string): Priority {
  const v = p.toLowerCase();
  if (v === 'low' || v === 'medium' || v === 'high' || v === 'critical') return v;
  return 'medium';
}

function fallbackDecompose(
  epicTitle: string,
  epicDescription: string,
  users: User[],
): SuggestedTask[] {
  const text = `${epicTitle}\n${epicDescription}`;
  const parts = text
    .split(/\n|;|(?=\d+[.)]\s)/)
    .map((s) => s.replace(/^\d+[.)]\s*/, '').trim())
    .filter((s) => s.length > 3);

  const chunks = parts.length >= 2 ? parts.slice(0, 12) : [epicTitle, ...parts].filter(Boolean);

  return chunks.map((chunk, i) => {
    const line = chunk.split('\n')[0] ?? chunk;
    const title = line.length > 80 ? `${line.slice(0, 77)}…` : line;
    return {
      title: title || `Подзадача ${i + 1}`,
      description: chunk,
      suggestedAssigneeId: assigneeForText(chunk, users, i),
      priority: 'medium' as Priority,
    };
  });
}

async function buildKnowledgeChunks(docIds: string[]): Promise<string[]> {
  const chunks: string[] = [];
  let total = 0;
  const max = 8000;

  for (const id of docIds) {
    const text = (await getKnowledgeText(id)) ?? '';
    const piece = text.slice(0, Math.min(4000, max - total));
    if (piece) {
      chunks.push(piece);
      total += piece.length;
    }
    if (total >= max) break;
  }

  return chunks;
}

interface CompletionBody {
  choices?: { message?: { content?: string } }[];
}

async function requestDecomposition(
  userPayload: string,
  users: User[],
  systemPrompt = SYSTEM_PROMPT,
): Promise<SuggestedTask[] | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return null;

  const { data, error } = await supabase.functions.invoke('openrouter', {
    body: {
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPayload },
      ],
    },
  });
  if (error || !data) return null;

  const content = (data as CompletionBody).choices?.[0]?.message?.content;
  if (!content) return null;

  let parsed: { tasks?: OpenAiTaskRow[] };
  try {
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    parsed = JSON.parse((fenced?.[1] ?? content).trim()) as { tasks?: OpenAiTaskRow[] };
  } catch {
    return null;
  }

  const suggestedTasks = (parsed.tasks ?? []).map((row, index) => {
    const text = `${row.title ?? ''} ${row.description ?? ''}`;
    return {
      title: row.title || 'Без названия',
      description: row.description || '',
      suggestedAssigneeId: resolveAssignee(row.assigneeName ?? '', text, users, index),
      priority: parsePriority(row.priority ?? 'medium'),
    };
  });

  return suggestedTasks.length > 0 ? suggestedTasks : null;
}

interface OpenAiTaskRow {
  title: string;
  description: string;
  priority: string;
  assigneeName?: string;
}

export async function decomposeEpic(params: {
  epicTitle: string;
  epicDescription: string;
  users: User[];
  knowledgeDocIds: string[];
}): Promise<AiDecompositionDraft> {
  const { epicTitle, epicDescription, users, knowledgeDocIds } = params;
  const knowledgeChunks = await buildKnowledgeChunks(knowledgeDocIds);

  const userPayload = JSON.stringify({
    epicTitle,
    epicDescription,
    team: users.map((u) => u.name),
    knowledge: knowledgeChunks.join('\n---\n'),
  });
  const suggestedTasks =
    (await requestDecomposition(userPayload, users)) ??
    fallbackDecompose(epicTitle, epicDescription, users);

  return {
    id: uid(),
    epicTitle,
    epicDescription,
    suggestedTasks,
    knowledgeDocIds,
    createdAt: new Date().toISOString(),
  };
}

export async function decomposeGlobalTask(text: string, users: User[]): Promise<AiDecompositionDraft> {
  const trimmed = text.trim();
  const firstLine = trimmed.split('\n')[0] ?? trimmed;
  const epicTitle = firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;
  const userPayload = JSON.stringify({
    epic: trimmed,
    team: users.map((user) => ({ name: user.name, role: user.role ?? null })),
  });
  const suggestedTasks =
    (await requestDecomposition(userPayload, users, ROLE_SYSTEM_PROMPT)) ??
    fallbackDecompose(epicTitle, trimmed, users);

  return {
    id: uid(),
    epicTitle: epicTitle || 'Задача',
    epicDescription: trimmed,
    suggestedTasks,
    knowledgeDocIds: [],
    createdAt: new Date().toISOString(),
  };
}
