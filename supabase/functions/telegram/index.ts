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
    text: "Нажмите кнопку ниже, чтобы обновить список.",
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
  messageId: number,
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

  await tgApi(token, "answerCallbackQuery", { callback_query_id: callbackId });
  await tgApi(token, "sendMessage", {
    chat_id: chatId,
    text: `📋 ${board.name}${desc}\n\nОткройте приложение: ${origin}`,
    reply_markup: mainKeyboard(),
  });
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
        text: `Команды:\n/start — справка\n/boards или «${BOARDS_BUTTON}» — список досок`,
        reply_markup: mainKeyboard(),
      });
    }
  } catch (err) {
    console.error(err);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});