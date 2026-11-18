ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS role text;

ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_pkey;
ALTER TABLE public.team_members ADD PRIMARY KEY (owner_id, id);
