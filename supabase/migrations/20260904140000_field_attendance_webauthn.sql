-- Field mobile attendance: device-bound WebAuthn credentials + short-lived challenges.
-- Privacy: stores public keys / credential IDs only — never biometric templates.

CREATE TABLE IF NOT EXISTS public.employee_device_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[] NULL,
  device_label TEXT NULL,
  aaguid TEXT NULL,
  backed_up BOOLEAN NULL DEFAULT FALSE,
  last_used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ NULL,
  CONSTRAINT employee_device_credentials_credential_id_unique UNIQUE (credential_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_device_credentials_employee
  ON public.employee_device_credentials (employee_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_employee_device_credentials_company
  ON public.employee_device_credentials (company_id)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE public.employee_device_credentials IS
  'WebAuthn public credentials for field mobile punch. OS verifies biometrics locally; server stores only public key + credential_id.';

CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  challenge TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('enroll', 'assert')),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_employee_purpose
  ON public.webauthn_challenges (employee_id, purpose, expires_at DESC);

COMMENT ON TABLE public.webauthn_challenges IS
  'One-time WebAuthn challenges for enroll/assert. TTL ~5 minutes; consumed after verify.';

ALTER TABLE public.employee_device_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

-- Authenticated tenant users can read/revoke credentials for their company (admin UX later).
-- Writes for enroll/assert go through service_role (createAdminClient) and bypass RLS.
CREATE POLICY employee_device_credentials_select_company
  ON public.employee_device_credentials
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.company_id = employee_device_credentials.company_id
            AND up.role IN ('company_admin', 'hr_manager', 'manager')
          )
          OR up.employee_id = employee_device_credentials.employee_id
        )
    )
  );

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
  );

-- Challenges: no direct client access; service_role / admin client only.
CREATE POLICY webauthn_challenges_deny_all
  ON public.webauthn_challenges
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
