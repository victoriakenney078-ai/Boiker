CREATE OR REPLACE FUNCTION public.openrouter_api_key()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = vault, public
AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = 'openrouter_api_key'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.openrouter_api_key() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.openrouter_api_key() FROM anon;
REVOKE ALL ON FUNCTION public.openrouter_api_key() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.openrouter_api_key() TO service_role;
