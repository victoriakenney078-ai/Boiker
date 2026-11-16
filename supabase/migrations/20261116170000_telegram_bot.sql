-- Привязка Telegram ↔ аккаунт AivibeBoard и одноразовые коды из настроек

CREATE TABLE public.telegram_link_codes (
  code text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX telegram_link_codes_user_id_idx ON public.telegram_link_codes (user_id);

CREATE TABLE public.telegram_accounts (
  telegram_user_id bigint PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  username text,
  linked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX telegram_accounts_user_id_idx ON public.telegram_accounts (user_id);

ALTER TABLE public.telegram_link_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY telegram_link_codes_select_own ON public.telegram_link_codes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY telegram_link_codes_insert_own ON public.telegram_link_codes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY telegram_link_codes_delete_own ON public.telegram_link_codes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY telegram_accounts_select_own ON public.telegram_accounts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.telegram_link_codes TO authenticated;
GRANT SELECT ON public.telegram_accounts TO authenticated;

CREATE OR REPLACE FUNCTION public.telegram_bot_token()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = vault, public
AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = 'telegram_bot_token'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.telegram_bot_token() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.telegram_bot_token() FROM anon;
REVOKE ALL ON FUNCTION public.telegram_bot_token() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_bot_token() TO service_role;