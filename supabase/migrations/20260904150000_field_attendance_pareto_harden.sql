-- Field attendance Pareto harden: enroll tokens, atomic challenge consume, RLS grants.

CREATE TABLE IF NOT EXISTS public.field_enroll_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL,
  created_by UUID NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT field_enroll_tokens_token_hash_unique UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_field_enroll_tokens_employee_open
  ON public.field_enroll_tokens (employee_id)
  WHERE consumed_at IS NULL;

COMMENT ON TABLE public.field_enroll_tokens IS
  'One-time HR-issued tokens required to enroll a field device (WebAuthn). Store hash only.';

ALTER TABLE public.field_enroll_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY field_enroll_tokens_select_hr
  ON public.field_enroll_tokens
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.company_id = field_enroll_tokens.company_id
            AND up.role IN ('company_admin', 'hr_manager', 'manager')
          )
        )
    )
  );

-- No direct client writes; service_role / admin client only.
CREATE POLICY field_enroll_tokens_deny_writes
  ON public.field_enroll_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY field_enroll_tokens_deny_update
  ON public.field_enroll_tokens
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY field_enroll_tokens_deny_delete
  ON public.field_enroll_tokens
  FOR DELETE
  TO authenticated
  USING (false);

-- Fix UPDATE policy WITH CHECK on credentials (prevent reassignment).
DROP POLICY IF EXISTS employee_device_credentials_update_company ON public.employee_device_credentials;
CREATE POLICY employee_device_credentials_update_company
  ON public.employee_device_credentials
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.company_id = employee_device_credentials.company_id
            AND up.role IN ('company_admin', 'hr_manager')
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.company_id = employee_device_credentials.company_id
            AND up.role IN ('company_admin', 'hr_manager')
          )
        )
    )
  );

-- Lock down grants (service_role bypasses RLS; anon must not touch these).
REVOKE ALL ON public.employee_device_credentials FROM PUBLIC, anon;
REVOKE ALL ON public.webauthn_challenges FROM PUBLIC, anon;
REVOKE ALL ON public.field_enroll_tokens FROM PUBLIC, anon;

GRANT SELECT ON public.employee_device_credentials TO authenticated;
GRANT UPDATE ON public.employee_device_credentials TO authenticated;
GRANT SELECT ON public.field_enroll_tokens TO authenticated;

-- Atomic challenge consume (service_role / SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.consume_webauthn_challenge(
  p_employee_id UUID,
  p_purpose TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge TEXT;
BEGIN
  IF p_purpose NOT IN ('enroll', 'assert') THEN
    RETURN NULL;
  END IF;

  UPDATE public.webauthn_challenges c
  SET consumed_at = NOW()
  WHERE c.id = (
    SELECT w.id
    FROM public.webauthn_challenges w
    WHERE w.employee_id = p_employee_id
      AND w.purpose = p_purpose
      AND w.consumed_at IS NULL
      AND w.expires_at > NOW()
    ORDER BY w.created_at DESC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING c.challenge INTO v_challenge;

  RETURN v_challenge;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_webauthn_challenge(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_webauthn_challenge(UUID, TEXT) TO service_role;

COMMENT ON FUNCTION public.consume_webauthn_challenge(UUID, TEXT) IS
  'Atomically consume the newest open WebAuthn challenge for employee+purpose. Returns challenge or NULL.';
