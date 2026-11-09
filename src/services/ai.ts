import type { AiDecompositionDraft, Priority, SuggestedTask, User } from '../types';
import { tStatic } from '../i18n';
import { getKnowledgeText } from './storage';

const SYSTEM_PROMPT = `You are an experienced project manager. Break the epic into 3-12 concrete actionable tasks.
Return ONLY valid JSON with this shape:
{"tasks":[{"title":"string","description":"string","priority":"low|medium|high|critical","assigneeName":"string or empty"}]}
Use assignee names exactly from the provided team list when possible. Priorities must be one of: low, medium, high, critical.`;

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
      suggestedAssigneeId: users.length ? users[i % users.length]!.id : null,
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

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  let suggestedTasks: SuggestedTask[];

  if (apiKey?.trim()) {
    const model = (import.meta.env.VITE_OPENAI_MODEL as string) || 'gpt-4o-mini';
    const userPayload = JSON.stringify({
      epicTitle,
      epicDescription,
      team: users.map((u) => u.name),
      knowledge: knowledgeChunks.join('\n---\n'),
    });

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPayload },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        tStatic('ai.errorOpenai', { status: res.status, detail: errText.slice(0, 200) }),
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error(tStatic('ai.errorEmpty'));

    let parsed: { tasks?: OpenAiTaskRow[] };
    try {
      parsed = JSON.parse(content) as { tasks?: OpenAiTaskRow[] };
    } catch {
      throw new Error(tStatic('ai.errorJson'));
    }

    const rows = parsed.tasks ?? [];
    suggestedTasks = rows.map((row) => {
      const name = (row.assigneeName ?? '').trim().toLowerCase();
      const user = users.find((u) => u.name.toLowerCase() === name);
      return {
        title: row.title || 'Без названия',
        description: row.description || '',
        suggestedAssigneeId: user?.id ?? null,
        priority: parsePriority(row.priority ?? 'medium'),
      };
    });

    if (suggestedTasks.length === 0) {
      suggestedTasks = fallbackDecompose(epicTitle, epicDescription, users);
    }
  } else {
    suggestedTasks = fallbackDecompose(epicTitle, epicDescription, users);
  }

  return {
    id: uid(),
    epicTitle,
    epicDescription,
    suggestedTasks,
    knowledgeDocIds,
    createdAt: new Date().toISOString(),
  };
}
