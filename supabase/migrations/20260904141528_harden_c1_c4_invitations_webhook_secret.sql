-- C4: employee_invitations no longer readable by anon (USING true + GRANT ALL).
-- Public validate/accept stay on service_role APIs (.eq token).
-- One-shot RPC for exact token lookup; no table GRANT to anon.
-- C3: per-device webhook secret hash (plaintext never stored).

ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS webhook_secret_hash text;

COMMENT ON COLUMN public.devices.webhook_secret_hash IS
  'SHA-256 hex of the attendance webhook shared secret. Plaintext is only placed on the device URL at provision time.';

CREATE INDEX IF NOT EXISTS idx_devices_company_webhook_secret_hash
  ON public.devices (company_id, webhook_secret_hash)
  WHERE webhook_secret_hash IS NOT NULL;

DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.employee_invitations;

REVOKE ALL ON TABLE public.employee_invitations FROM anon;
REVOKE ALL ON TABLE public.employee_invitations FROM PUBLIC;

REVOKE ALL ON TABLE public.employee_invitations FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.employee_invitations TO authenticated;

CREATE OR REPLACE FUNCTION public.lookup_employee_invitation_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  email text,
  employee_id uuid,
  status text,
  expires_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
BEGIN
  IF p_token IS NULL OR char_length(btrim(p_token)) < 16 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    i.id,
    i.email,
    i.employee_id,
    i.status,
    i.expires_at
  FROM public.employee_invitations AS i
  WHERE i.token = btrim(p_token)
    AND i.status = 'pending'
    AND i.expires_at > pg_catalog.now()
  ORDER BY i.created_at DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.lookup_employee_invitation_by_token(text) IS
  'One-shot invitation lookup by exact token. Does not expose other rows.';

REVOKE ALL ON FUNCTION public.lookup_employee_invitation_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_employee_invitation_by_token(text) TO anon, authenticated;
