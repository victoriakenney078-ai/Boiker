import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MODEL = "openai/gpt-6-luna";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function readApiKey(): Promise<string | null> {
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const apiKey = await readApiKey();
  if (!apiKey) {
    return json({ error: "OPENROUTER_API_KEY is not configured" }, 500);
  }

  let payload: { messages?: unknown; temperature?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
    return json({ error: "messages is required" }, 400);
  }

  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.4;
  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": req.headers.get("origin") ?? "http://localhost:5173",
      "X-Title": "AivibeBoard",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature,
      messages: payload.messages,
    }),
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
