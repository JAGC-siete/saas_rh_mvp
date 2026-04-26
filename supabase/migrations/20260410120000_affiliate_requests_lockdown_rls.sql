-- affiliate_requests: acceso solo vía backend (service role).
-- Las rutas /api/affiliates/* y /api/admin/affiliates/* ya usan service role;
-- anon/authenticated no deben leer ni escribir esta tabla por PostgREST.

ALTER TABLE public.affiliate_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert" ON public.affiliate_requests;
DROP POLICY IF EXISTS "public_select_by_token" ON public.affiliate_requests;
DROP POLICY IF EXISTS "public_update_by_token" ON public.affiliate_requests;
DROP POLICY IF EXISTS "admin_select_all" ON public.affiliate_requests;
DROP POLICY IF EXISTS "admin_update_all" ON public.affiliate_requests;

REVOKE ALL ON TABLE public.affiliate_requests FROM anon;
REVOKE ALL ON TABLE public.affiliate_requests FROM authenticated;
