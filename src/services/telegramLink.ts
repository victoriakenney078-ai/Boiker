import { supabase } from './supabase';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

export async function createTelegramLinkCode(): Promise<{ code: string } | { error: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return { error: 'no-session' };

  const code = randomCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await supabase.from('telegram_link_codes').delete().eq('user_id', userId);

  const { error } = await supabase.from('telegram_link_codes').insert({
    code,
    user_id: userId,
    expires_at: expiresAt,
  });
  if (error) return { error: error.message };
  return { code };
}

export async function fetchTelegramLinkStatus(): Promise<{
  linked: boolean;
  username: string | null;
}> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return { linked: false, username: null };

  const { data } = await supabase
    .from('telegram_accounts')
    .select('username')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    linked: Boolean(data),
    username: data?.username ?? null,
  };
}