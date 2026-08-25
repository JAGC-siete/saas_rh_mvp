-- Humano SISU ↔ Odoo MVP: connections, account map, id map, outbox.
-- RLS by company_id (same pattern as accounting module).

CREATE TYPE odoo_version_enum AS ENUM ('18.0', '19.0');
CREATE TYPE odoo_outbox_kind_enum AS ENUM ('employee', 'journal_entry');
CREATE TYPE odoo_outbox_status_enum AS ENUM ('pending', 'processing', 'sent', 'dead');

CREATE TABLE odoo_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  base_url TEXT NOT NULL,
  database_name TEXT,
  odoo_version odoo_version_enum NOT NULL,
  odoo_company_id INTEGER,
  journal_code TEXT NOT NULL DEFAULT 'NOM',
  odoo_login TEXT,
  api_key_ciphertext TEXT NOT NULL,
  key_expires_at TIMESTAMPTZ,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id)
);

COMMENT ON TABLE odoo_connections IS 'One Odoo ERP company per SISU company. API key is AES-GCM ciphertext; never plaintext.';
COMMENT ON COLUMN odoo_connections.database_name IS 'X-Odoo-Database / XML-RPC db. Optional if host is unique.';
COMMENT ON COLUMN odoo_connections.odoo_company_id IS 'res.company id on the Odoo side.';
COMMENT ON COLUMN odoo_connections.odoo_login IS 'XML-RPC login (Odoo 18). Unused for JSON-2 (19).';

CREATE TABLE odoo_account_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sisu_account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
  odoo_account_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, sisu_account_id)
);

CREATE INDEX idx_odoo_account_map_company ON odoo_account_map (company_id);

CREATE TABLE odoo_id_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entity TEXT NOT NULL,
  sisu_id UUID NOT NULL,
  odoo_id INTEGER NOT NULL,
  odoo_model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, entity, sisu_id)
);

CREATE INDEX idx_odoo_id_map_company ON odoo_id_map (company_id);

CREATE TABLE odoo_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kind odoo_outbox_kind_enum NOT NULL,
  job_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  status odoo_outbox_status_enum NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX odoo_outbox_open_job_key
  ON odoo_outbox (company_id, job_key)
  WHERE status IN ('pending', 'processing');

CREATE INDEX idx_odoo_outbox_pending
  ON odoo_outbox (company_id, created_at)
  WHERE status = 'pending';

CREATE INDEX idx_odoo_outbox_processing
  ON odoo_outbox (updated_at)
  WHERE status = 'processing';

CREATE INDEX idx_odoo_outbox_dead
  ON odoo_outbox (company_id, created_at DESC)
  WHERE status = 'dead';

ALTER TABLE odoo_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE odoo_account_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE odoo_id_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE odoo_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY odoo_connections_select
  ON odoo_connections FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY odoo_connections_admin
  ON odoo_connections FOR ALL TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager'))
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager'))
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY odoo_account_map_select
  ON odoo_account_map FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY odoo_account_map_admin
  ON odoo_account_map FOR ALL TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager'))
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager'))
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY odoo_id_map_select
  ON odoo_id_map FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY odoo_id_map_admin
  ON odoo_id_map FOR ALL TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager'))
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager'))
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY odoo_outbox_select
  ON odoo_outbox FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY odoo_outbox_admin
  ON odoo_outbox FOR ALL TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager'))
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager'))
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON odoo_connections, odoo_account_map, odoo_id_map, odoo_outbox TO authenticated;
GRANT ALL ON odoo_connections, odoo_account_map, odoo_id_map, odoo_outbox TO service_role;
