-- Копия локальной команды для бота и ожидание текста задачи в Telegram

CREATE TABLE public.team_members (
  id uuid NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  PRIMARY KEY (owner_id, id),
  name text NOT NULL,
  role text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX team_members_owner_id_idx ON public.team_members (owner_id);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY team_members_select_own ON public.team_members
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY team_members_insert_own ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY team_members_update_own ON public.team_members
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY team_members_delete_own ON public.team_members
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;

CREATE TABLE public.telegram_sessions (
  telegram_user_id bigint PRIMARY KEY,
  board_id uuid NOT NULL REFERENCES public.boards (id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('awaiting_task')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_sessions ENABLE ROW LEVEL SECURITY;
