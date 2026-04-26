-- Migration: Create accounting module for payroll (Honduras NIIF)
-- Date: 2026-03-02
-- Description: chart_of_accounts, payroll_concepts, accounting_mappings, journal_entries, journal_entry_lines
-- Phase 1: Database foundations only. No business logic.

-- =====================================================
-- 1. ENUMS
-- =====================================================

CREATE TYPE account_type_enum AS ENUM ('activo', 'pasivo', 'patrimonio', 'ingreso', 'gasto');
CREATE TYPE cost_center_type_enum AS ENUM ('ventas', 'administracion', 'produccion');
CREATE TYPE journal_entry_status_enum AS ENUM ('draft', 'posted', 'void');

-- =====================================================
-- 2. PAYROLL_CONCEPTS (global catalog, no company_id)
-- =====================================================

CREATE TABLE payroll_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_provision_payment BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE payroll_concepts IS 'Global catalog of payroll concepts. is_provision_payment=true when concept debits liability (payment reversal) instead of expense.';
COMMENT ON COLUMN payroll_concepts.is_provision_payment IS 'When true: Debit Pasivo (rebaja provisión), Credit Bancos. When false: Debit Gasto, Credit Pasivo.';

-- =====================================================
-- 3. CHART_OF_ACCOUNTS (per company)
-- =====================================================

CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type account_type_enum NOT NULL,
  parent_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

CREATE INDEX idx_chart_of_accounts_company ON chart_of_accounts(company_id);
CREATE INDEX idx_chart_of_accounts_code ON chart_of_accounts(company_id, code);

COMMENT ON TABLE chart_of_accounts IS 'Company-specific chart of accounts (NIIF). Codes vary by company (4, 6, 8 digits).';

-- =====================================================
-- 4. ACCOUNTING_MAPPINGS (concept -> accounts, per company)
-- =====================================================

CREATE TABLE accounting_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES payroll_concepts(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  cost_center_type cost_center_type_enum,
  debit_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  credit_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  is_provision_payment BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT accounting_mappings_at_least_one_account CHECK (
    debit_account_id IS NOT NULL OR credit_account_id IS NOT NULL
  )
);

CREATE INDEX idx_accounting_mappings_company ON accounting_mappings(company_id);
CREATE INDEX idx_accounting_mappings_concept ON accounting_mappings(company_id, concept_id);
CREATE INDEX idx_accounting_mappings_department ON accounting_mappings(company_id, department_id);

COMMENT ON TABLE accounting_mappings IS 'Bridge: payroll concept -> chart accounts. department_id/cost_center_type for cost center routing. is_provision_payment for 13°/14° payment reversal.';

-- =====================================================
-- 5. JOURNAL_ENTRIES (header)
-- =====================================================

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE SET NULL,
  entry_number TEXT,
  entry_date DATE NOT NULL,
  currency TEXT NOT NULL DEFAULT 'HNL',
  exchange_rate NUMERIC(12,6) DEFAULT 1,
  status journal_entry_status_enum NOT NULL DEFAULT 'draft',
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_reference JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_journal_entries_company ON journal_entries(company_id);
CREATE INDEX idx_journal_entries_run ON journal_entries(payroll_run_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(company_id, entry_date);

COMMENT ON COLUMN journal_entries.source_reference IS 'Link to payroll_run: {"payroll_run_id": "uuid", "period": "2025-06"}. For audit trail.';
COMMENT ON COLUMN journal_entries.created_by IS 'User who generated the batch. Audit trail.';

-- =====================================================
-- 6. JOURNAL_ENTRY_LINES (detail)
-- =====================================================

CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  debit_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  cost_center_type cost_center_type_enum,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT journal_entry_lines_debit_credit CHECK (
    (debit_amount >= 0 AND credit_amount >= 0)
    AND (debit_amount > 0 OR credit_amount > 0)
    AND NOT (debit_amount > 0 AND credit_amount > 0)
  )
);

CREATE INDEX idx_journal_entry_lines_entry ON journal_entry_lines(journal_entry_id);

-- =====================================================
-- 7. RLS
-- =====================================================

ALTER TABLE payroll_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

-- payroll_concepts: read-only for all authenticated (global catalog)
CREATE POLICY payroll_concepts_select_all
  ON payroll_concepts FOR SELECT TO authenticated USING (true);

-- chart_of_accounts: company isolation
CREATE POLICY chart_of_accounts_select
  ON chart_of_accounts FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY chart_of_accounts_admin
  ON chart_of_accounts FOR ALL TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager'))
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager'))
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- accounting_mappings: company isolation
CREATE POLICY accounting_mappings_select
  ON accounting_mappings FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY accounting_mappings_admin
  ON accounting_mappings FOR ALL TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager'))
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager'))
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- journal_entries: company isolation
CREATE POLICY journal_entries_select
  ON journal_entries FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY journal_entries_admin
  ON journal_entries FOR ALL TO authenticated
  USING (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager'))
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager'))
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- journal_entry_lines: via journal_entry
CREATE POLICY journal_entry_lines_select
  ON journal_entry_lines FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.id = journal_entry_lines.journal_entry_id
        AND (
          je.company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
          OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
        )
    )
  );

CREATE POLICY journal_entry_lines_admin
  ON journal_entry_lines FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.id = journal_entry_lines.journal_entry_id
        AND (
          je.company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager'))
          OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.id = journal_entry_lines.journal_entry_id
        AND (
          je.company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager'))
          OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
        )
    )
  );

-- =====================================================
-- 8. TRIGGERS
-- =====================================================

CREATE TRIGGER payroll_concepts_updated_at
  BEFORE UPDATE ON payroll_concepts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER chart_of_accounts_updated_at
  BEFORE UPDATE ON chart_of_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER accounting_mappings_updated_at
  BEFORE UPDATE ON accounting_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
