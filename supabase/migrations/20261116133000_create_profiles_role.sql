CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (
    role IN (
      'productManager',
      'projectManager',
      'businessAnalyst',
      'scrumMaster',
      'techLead',
      'frontend',
      'backend',
      'fullstack',
      'mobile',
      'qa',
      'devops',
      'designer',
      'dataAnalyst',
      'sysadmin'
    )
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
REVOKE ALL ON public.profiles FROM anon;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chosen text;
BEGIN
  chosen := NEW.raw_user_meta_data ->> 'role';
  IF chosen IN (
    'productManager',
    'projectManager',
    'businessAnalyst',
    'scrumMaster',
    'techLead',
    'frontend',
    'backend',
    'fullstack',
    'mobile',
    'qa',
    'devops',
    'designer',
    'dataAnalyst',
    'sysadmin'
  ) THEN
    INSERT INTO public.profiles (id, role)
    VALUES (NEW.id, chosen)
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();
