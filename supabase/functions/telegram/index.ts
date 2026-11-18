import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BOARDS_BUTTON = "Мои доски";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TgUpdate = {
  message?: {
    chat: { id: number };
    from?: { id: number; username?: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number };
    data?: string;
    message?: { chat: { id: number }; message_id: number };
  };
};

interface BoardRow {
  id: string;
  name: string;
  description: string | null;
}

async function readBotToken(): Promise<string | null> {
  const fromEnv = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (fromEnv) return fromEnv;

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return null;

  const res = await fetch(`${url}/rest/v1/rpc/telegram_bot_token`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (!res.ok) return null;
  const value = await res.json();
  return typeof value === "string" && value.length > 0 ? value : null;
}

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function tgApi(token: string, method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`telegram ${method}`, await res.text());
  }
  return res;
}

function mainKeyboard() {
  return {
    keyboard: [[{ text: BOARDS_BUTTON }]],
    resize_keyboard: true,
  };
}

async function resolveUserId(
  supabase: ReturnType<typeof createClient>,
  telegramUserId: number,
): Promise<string | null> {
  const { data } = await supabase
    .from("telegram_accounts")
    .select("user_id")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function fetchBoards(
  supabase: ReturnType<typeof createClient>,
  ownerId: string,
): Promise<BoardRow[]> {
  const { data } = await supabase
    .from("boards")
    .select("id, name, description")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });
  return (data ?? []) as BoardRow[];
}

async function sendBoardsList(
  token: string,
  chatId: number,
  supabase: ReturnType<typeof createClient>,
  telegramUserId: number,
) {
  const ownerId = await resolveUserId(supabase, telegramUserId);
  if (!ownerId) {
    await tgApi(token, "sendMessage", {
      chat_id: chatId,
      text:
        "Аккаунт не привязан. В AivibeBoard откройте «Настройки», нажмите «Код для Telegram» и отправьте боту:\n/start КОД",
      reply_markup: mainKeyboard(),
    });
    return;
  }

  const boards = await fetchBoards(supabase, ownerId);
  if (boards.length === 0) {
    await tgApi(token, "sendMessage", {
      chat_id: chatId,
      text: "У вас пока нет досок. Создайте доску в AivibeBoard на сайте.",
      reply_markup: mainKeyboard(),
    });
    return;
  }

  const lines = boards.map((b, i) => `${i + 1}. ${b.name}`).join("\n");
  const inline = boards.slice(0, 20).map((b) => [
    { text: b.name.slice(0, 40), callback_data: `board:${b.id}` },
  ]);

  await tgApi(token, "sendMessage", {
    chat_id: chatId,
    text: `Ваши доски (${boards.length}):\n\n${lines}`,
    reply_markup: { inline_keyboard: inline },
  });
  await tgApi(token, "sendMessage", {
    chat_id: chatId,
    text: "Выберите доску. Следующим сообщением опишите крупную задачу — она разобьётся и назначится участникам.",
    reply_markup: mainKeyboard(),
  });
}

async function linkWithCode(
  token: string,
  chatId: number,
  telegramUserId: number,
  username: string | undefined,
  code: string,
  supabase: ReturnType<typeof createClient>,
) {
  const normalized = code.trim().toUpperCase();
  const { data: row } = await supabase
    .from("telegram_link_codes")
    .select("user_id, expires_at")
    .eq("code", normalized)
    .maybeSingle();

  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    await tgApi(token, "sendMessage", {
      chat_id: chatId,
      text: "Код неверный или истёк. Создайте новый код в настройках AivibeBoard.",
      reply_markup: mainKeyboard(),
    });
    return;
  }

  await supabase.from("telegram_accounts").upsert(
    {
      telegram_user_id: telegramUserId,
      user_id: row.user_id,
      username: username ?? null,
      linked_at: new Date().toISOString(),
    },
    { onConflict: "telegram_user_id" },
  );

  await supabase.from("telegram_link_codes").delete().eq("code", normalized);

  await tgApi(token, "sendMessage", {
    chat_id: chatId,
    text: "Готово! AivibeBoard привязан к этому чату. Нажмите «Мои доски», чтобы увидеть список.",
    reply_markup: mainKeyboard(),
  });
}

async function handleBoardCallback(
  token: string,
  supabase: ReturnType<typeof createClient>,
  telegramUserId: number,
  chatId: number,
  _messageId: number,
  boardId: string,
  callbackId: string,
) {
  const ownerId = await resolveUserId(supabase, telegramUserId);
  if (!ownerId) {
    await tgApi(token, "answerCallbackQuery", {
      callback_query_id: callbackId,
      text: "Сначала привяжите аккаунт",
      show_alert: true,
    });
    return;
  }

  const { data: board } = await supabase
    .from("boards")
    .select("name, description")
    .eq("id", boardId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (!board) {
    await tgApi(token, "answerCallbackQuery", {
      callback_query_id: callbackId,
      text: "Доска не найдена",
      show_alert: true,
    });
    return;
  }

  const origin = Deno.env.get("APP_ORIGIN") ?? "http://localhost:5173";
  const desc = board.description?.trim() ? `\n\n${board.description}` : "";

  await supabase.from("telegram_sessions").upsert(
    {
      telegram_user_id: telegramUserId,
      board_id: boardId,
      mode: "awaiting_task",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "telegram_user_id" },
  );

  await tgApi(token, "answerCallbackQuery", { callback_query_id: callbackId });
  await tgApi(token, "sendMessage", {
    chat_id: chatId,
    text: `Доска «${board.name}»${desc}\n\nНапишите крупную задачу одним сообщением. Она разобьётся на подзадачи и назначится участникам этой доски.\n\nСайт: ${origin}`,
    reply_markup: mainKeyboard(),
  });
}

const ROLE_HINTS: Record<string, string[]> = {
  productManager: ["продукт", "roadmap", "приоритет", "product", "vision"],
  projectManager: ["срок", "план", "координац", "project", "milestone"],
  businessAnalyst: ["требован", "анализ", "спецификац", "бизнес", "requirement"],
  scrumMaster: ["спринт", "ретро", "стендап", "scrum", "agile"],
  techLead: ["архитектур", "ревью", "техлид", "architecture"],
  frontend: ["интерфейс", "вёрст", "верст", "экран", "кнопк", "frontend", "react", "ui"],
  backend: ["api", "сервер", "база", "backend", "endpoint"],
  fullstack: ["fullstack", "полный цикл"],
  mobile: ["мобил", "ios", "android", "mobile"],
  qa: ["тест", "баг", "провер", "qa"],
  devops: ["деплой", "ci", "docker", "инфра", "devops"],
  designer: ["дизайн", "макет", "ux", "прототип"],
  dataAnalyst: ["данн", "метрик", "отчёт", "отчет", "аналитик"],
  sysadmin: ["доступ", "админ", "учетн", "учётн", "sysadmin"],
};

const ROLE_SYSTEM_PROMPT = `You are an experienced project manager. Break the epic into 3-12 concrete actionable tasks.
Assign each task to the team member whose role best fits the work.
Return ONLY valid JSON with this shape:
{"tasks":[{"title":"string","description":"string","priority":"low|medium|high|critical","assigneeName":"string"}]}
Copy assigneeName exactly from the team list. Priorities must be one of: low, medium, high, critical.`;

interface MemberRow {
  id: string;
  name: string;
  role: string | null;
}

interface PlannedTask {
  title: string;
  description: string;
  priority: string;
  assigneeId: string | null;
}

function assigneeForText(text: string, members: MemberRow[], index: number): string | null {
  const hay = text.toLowerCase();
  const matched = members.find(
    (member) => member.role && (ROLE_HINTS[member.role] ?? []).some((hint) => hay.includes(hint)),
  );
  if (matched) return matched.id;
  return members.length ? members[index % members.length]!.id : null;
}

function fallbackTasks(text: string, members: MemberRow[]): PlannedTask[] {
  const parts = text
    .split(/\n|;|(?=\d+[.)]\s)/)
    .map((part) => part.replace(/^\d+[.)]\s*/, "").trim())
    .filter((part) => part.length > 3);
  const chunks = parts.length >= 2 ? parts.slice(0, 12) : [text.trim()].filter(Boolean);
  return chunks.map((chunk, index) => {
    const line = chunk.split("\n")[0] ?? chunk;
    return {
      title: line.length > 80 ? `${line.slice(0, 77)}…` : line || `Подзадача ${index + 1}`,
      description: chunk,
      priority: "medium",
      assigneeId: assigneeForText(chunk, members, index),
    };
  });
}

function parsePriority(value: string): string {
  const v = value.toLowerCase();
  if (v === "low" || v === "medium" || v === "high" || v === "critical") return v;
  return "medium";
}

async function readOpenRouterKey(): Promise<string | null> {
  const fromEnv = Deno.env.get("OPENROUTER_API_KEY");
  if (fromEnv) return fromEnv;
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return null;
  const res = await fetch(`${url}/rest/v1/rpc/openrouter_api_key`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (!res.ok) return null;
  const value = await res.json();
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function planTasks(text: string, members: MemberRow[]): Promise<PlannedTask[]> {
  const apiKey = await readOpenRouterKey();
  if (!apiKey) return fallbackTasks(text, members);

  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:5173",
      "X-Title": "AivibeBoard",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-luna",
      temperature: 0.4,
      messages: [
        { role: "system", content: ROLE_SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            epic: text,
            team: members.map((member) => ({ name: member.name, role: member.role })),
          }),
        },
      ],
    }),
  });
  if (!upstream.ok) return fallbackTasks(text, members);

  const data = await upstream.json();
  const content = data?.choices?.[0]?.message?.content as string | undefined;
  if (!content) return fallbackTasks(text, members);

  try {
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const parsed = JSON.parse((fenced?.[1] ?? content).trim()) as {
      tasks?: { title?: string; description?: string; priority?: string; assigneeName?: string }[];
    };
    const tasks = (parsed.tasks ?? []).map((row, index) => {
      const title = row.title?.trim() || "Без названия";
      const description = row.description?.trim() || "";
      const named = (row.assigneeName ?? "").trim().toLowerCase();
      const byName = members.find((member) => member.name.toLowerCase() === named);
      return {
        title,
        description,
        priority: parsePriority(row.priority ?? "medium"),
        assigneeId: byName?.id ?? assigneeForText(`${title} ${description}`, members, index),
      };
    });
    return tasks.length > 0 ? tasks : fallbackTasks(text, members);
  } catch {
    return fallbackTasks(text, members);
  }
}

async function handleEpicText(
  token: string,
  supabase: ReturnType<typeof createClient>,
  telegramUserId: number,
  chatId: number,
  text: string,
): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const { data: session } = await supabase
    .from("telegram_sessions")
    .select("board_id, mode")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();
  if (!session || session.mode !== "awaiting_task") return false;

  const ownerId = await resolveUserId(supabase, telegramUserId);
  if (!ownerId) return false;

  const { data: board } = await supabase
    .from("boards")
    .select("id, name, member_ids")
    .eq("id", session.board_id)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!board) {
    await supabase.from("telegram_sessions").delete().eq("telegram_user_id", telegramUserId);
    await tgApi(token, "sendMessage", {
      chat_id: chatId,
      text: "Доска больше недоступна. Откройте список заново.",
      reply_markup: mainKeyboard(),
    });
    return true;
  }

  const memberIds = (board.member_ids ?? []) as string[];
  const { data: team } = await supabase
    .from("team_members")
    .select("id, name, role")
    .eq("owner_id", ownerId);
  const all = (team ?? []) as MemberRow[];
  const members = memberIds.length > 0 ? all.filter((member) => memberIds.includes(member.id)) : all;

  if (members.length === 0) {
    await tgApi(token, "sendMessage", {
      chat_id: chatId,
      text: "На доске нет участников в облаке. Откройте AivibeBoard в браузере (раздел «Команда»), затем снова отправьте задачу.",
      reply_markup: mainKeyboard(),
    });
    return true;
  }

  await tgApi(token, "sendMessage", {
    chat_id: chatId,
    text: "Разбиваю задачу…",
  });

  const firstLine = trimmed.split("\n")[0] ?? trimmed;
  const epicTitle = firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;
  const planned = await planTasks(trimmed, members);

  const { data: columns } = await supabase
    .from("board_columns")
    .select("id, title, sort_order")
    .eq("board_id", board.id)
    .order("sort_order", { ascending: true });
  const backlog =
    (columns ?? []).find((column) => column.title === "Бэклог") ?? (columns ?? [])[0];
  if (!backlog) {
    await tgApi(token, "sendMessage", {
      chat_id: chatId,
      text: "Не найдена колонка «Бэклог».",
      reply_markup: mainKeyboard(),
    });
    return true;
  }

  const now = new Date().toISOString();
  const epicId = crypto.randomUUID();
  const rows = [
    {
      id: epicId,
      board_id: board.id,
      column_id: backlog.id,
      title: epicTitle || "Задача",
      description: trimmed,
      assignee_id: null,
      priority: "high",
      labels: ["Эпик"],
      subtasks: [],
      parent_task_id: null,
      source: "ai",
      created_at: now,
      updated_at: now,
    },
    ...planned.map((task) => ({
      id: crypto.randomUUID(),
      board_id: board.id,
      column_id: backlog.id,
      title: task.title,
      description: task.description,
      assignee_id: task.assigneeId,
      priority: task.priority,
      labels: [],
      subtasks: [],
      parent_task_id: epicId,
      source: "ai",
      created_at: now,
      updated_at: now,
    })),
  ];

  const { error } = await supabase.from("board_tasks").insert(rows);
  if (error) {
    console.error(error);
    await tgApi(token, "sendMessage", {
      chat_id: chatId,
      text: "Не удалось создать задачи. Попробуйте ещё раз.",
      reply_markup: mainKeyboard(),
    });
    return true;
  }

  await supabase.from("telegram_sessions").delete().eq("telegram_user_id", telegramUserId);
  const lines = planned.map((task) => {
    const name = members.find((member) => member.id === task.assigneeId)?.name ?? "без исполнителя";
    return `${task.title} — ${name}`;
  });
  await tgApi(token, "sendMessage", {
    chat_id: chatId,
    text: `Создано задач: ${planned.length} на доске «${board.name}»\n\n${lines.join("\n")}`,
    reply_markup: mainKeyboard(),
  });
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  const token = await readBotToken();
  const supabase = serviceClient();
  if (!token || !supabase) {
    return new Response(JSON.stringify({ error: "Bot not configured" }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  let update: TgUpdate;
  try {
    update = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 400, headers: corsHeaders });
  }

  try {
    if (update.callback_query) {
      const cq = update.callback_query;
      const data = cq.data ?? "";
      if (data.startsWith("board:") && cq.message) {
        await handleBoardCallback(
          token,
          supabase,
          cq.from.id,
          cq.message.chat.id,
          cq.message.message_id,
          data.slice(6),
          cq.id,
        );
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    const message = update.message;
    if (!message?.from || message.chat?.id === undefined) {
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    const chatId = message.chat.id;
    const text = (message.text ?? "").trim();
    const from = message.from;

    if (text.startsWith("/start")) {
      const parts = text.split(/\s+/);
      const code = parts[1];
      if (code) {
        await linkWithCode(token, chatId, from.id, from.username, code, supabase);
      } else {
        await tgApi(token, "sendMessage", {
          chat_id: chatId,
          text:
            "AivibeBoard — ваши канбан-доски в Telegram.\n\nПривязка: в настройках на сайте нажмите «Код для Telegram», затем отправьте сюда /start КОД\n\nКнопка «Мои доски» покажет список досок.",
          reply_markup: mainKeyboard(),
        });
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (text === BOARDS_BUTTON || text === "/boards") {
      await sendBoardsList(token, chatId, supabase, from.id);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (text === "/help") {
      await tgApi(token, "sendMessage", {
        chat_id: chatId,
        text: `Команды:\n/start — справка\n/boards или «${BOARDS_BUTTON}» — список досок\n\nВыберите доску в списке и следующим сообщением опишите крупную задачу.`,
        reply_markup: mainKeyboard(),
      });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (!text.startsWith("/")) {
      const handled = await handleEpicText(token, supabase, from.id, chatId, text);
      if (handled) {
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }
    }
  } catch (err) {
    console.error(err);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});