-- boards
CREATE TABLE public.boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  member_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX boards_owner_id_idx ON public.boards (owner_id);

-- columns
CREATE TABLE public.board_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards (id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX board_columns_board_id_idx ON public.board_columns (board_id);

-- tasks
CREATE TABLE public.board_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards (id) ON DELETE CASCADE,
  column_id uuid NOT NULL REFERENCES public.board_columns (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  assignee_id uuid,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  labels text[] NOT NULL DEFAULT '{}',
  subtasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  parent_task_id uuid,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai', 'telegram')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX board_tasks_board_id_idx ON public.board_tasks (board_id);
CREATE INDEX board_tasks_column_id_idx ON public.board_tasks (column_id);

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_tasks ENABLE ROW LEVEL SECURITY;

-- boards policies
CREATE POLICY boards_select_own ON public.boards
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY boards_insert_own ON public.boards
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY boards_update_own ON public.boards
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY boards_delete_own ON public.boards
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- columns policies
CREATE POLICY board_columns_select ON public.board_columns
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id = board_columns.board_id AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY board_columns_insert ON public.board_columns
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id = board_columns.board_id AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY board_columns_update ON public.board_columns
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id = board_columns.board_id AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id = board_columns.board_id AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY board_columns_delete ON public.board_columns
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id = board_columns.board_id AND b.owner_id = auth.uid()
    )
  );

-- tasks policies
CREATE POLICY board_tasks_select ON public.board_tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id = board_tasks.board_id AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY board_tasks_insert ON public.board_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id = board_tasks.board_id AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY board_tasks_update ON public.board_tasks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id = board_tasks.board_id AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id = board_tasks.board_id AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY board_tasks_delete ON public.board_tasks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id = board_tasks.board_id AND b.owner_id = auth.uid()
    )
  );
