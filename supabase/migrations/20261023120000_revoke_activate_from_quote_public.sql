-- activate_from_quote is SECURITY DEFINER: it records a manual payment and turns the
-- company into a paid plan, with the plan type and payment kind chosen by the caller.
-- anon and authenticated could execute it through PostgREST with the public key, so any
-- trial user with a quote could activate Enterprise for a year without paying
-- (verified on 2026-10-23 with has_function_privilege).
-- Its only callers are server API routes using the service role, so nobody else needs it.
-- PUBLIC is revoked too: Postgres grants EXECUTE to PUBLIC by default on new functions.

REVOKE EXECUTE ON FUNCTION public.activate_from_quote(uuid, numeric, text, uuid, uuid, timestamptz, text, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.activate_from_quote(uuid, numeric, text, uuid, uuid, timestamptz, text, text)
  TO service_role;
