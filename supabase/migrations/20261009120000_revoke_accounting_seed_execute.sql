-- accounting_seed_company_defaults is SECURITY DEFINER and takes any p_company_id, so
-- anon/authenticated callers could write chart rows and mappings into another company.
-- Only the API (service_role, after role + tenant checks) needs to call it.
-- PUBLIC is revoked too: Postgres grants EXECUTE to PUBLIC by default on new functions.

REVOKE EXECUTE ON FUNCTION public.accounting_seed_company_defaults(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accounting_seed_company_defaults(uuid) TO service_role;
