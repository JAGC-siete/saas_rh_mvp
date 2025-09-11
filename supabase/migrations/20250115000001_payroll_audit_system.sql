-- Migration: Payroll Audit System Implementation
-- Date: 2025-01-15
-- Description: Implements payroll_adjustments, payroll_snapshots, and audit system

-- 1) Corrida de planilla (extensión de payroll_records existente)
CREATE TABLE IF NOT EXISTS payroll_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_uuid    UUID NOT NULL,
  year            INT  NOT NULL,
  month           INT  NOT NULL CHECK (month BETWEEN 1 AND 12),
  quincena        INT  NOT NULL CHECK (quincena IN (1,2)),
  tipo            TEXT NOT NULL CHECK (tipo IN ('CON','SIN')),
  status          TEXT NOT NULL CHECK (status IN ('draft','edited','authorized','distributed')),
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_uuid, year, month, quincena, tipo)
);

-- 2) Líneas calculadas de la corrida (snapshot base)
CREATE TABLE IF NOT EXISTS payroll_run_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  company_uuid    UUID NOT NULL,
  employee_id     UUID NOT NULL,
  -- valores calculados (base)
  calc_hours      NUMERIC(10,2) NOT NULL,
  calc_bruto      NUMERIC(12,2) NOT NULL,
  calc_ihss       NUMERIC(12,2) NOT NULL,
  calc_rap        NUMERIC(12,2) NOT NULL,
  calc_isr        NUMERIC(12,2) NOT NULL,
  calc_neto       NUMERIC(12,2) NOT NULL,
  -- valores efectivos (base ⊕ overrides); se mantienen por trigger
  eff_hours       NUMERIC(10,2) NOT NULL,
  eff_bruto       NUMERIC(12,2) NOT NULL,
  eff_ihss        NUMERIC(12,2) NOT NULL,
  eff_rap         NUMERIC(12,2) NOT NULL,
  eff_isr         NUMERIC(12,2) NOT NULL,
  eff_neto        NUMERIC(12,2) NOT NULL,
  edited          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (run_id, employee_id)
);

-- 3) Ajustes manuales (historial completo)
CREATE TABLE IF NOT EXISTS payroll_adjustments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_line_id     UUID NOT NULL REFERENCES payroll_run_lines(id) ON DELETE CASCADE,
  company_uuid    UUID NOT NULL,
  field           TEXT NOT NULL CHECK (field IN ('hours','bruto','ihss','rap','isr','neto')),
  old_value       NUMERIC(12,2),
  new_value       NUMERIC(12,2) NOT NULL,
  reason          TEXT,
  user_id         UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Snapshots versiónados (backup de originales y de cada versión)
CREATE TABLE IF NOT EXISTS payroll_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_line_id     UUID NOT NULL REFERENCES payroll_run_lines(id) ON DELETE CASCADE,
  company_uuid    UUID NOT NULL,
  version         INT NOT NULL,                      -- 0 = original calculado, 1..n = tras ajustes
  payload         JSONB NOT NULL,                    -- dump de la línea (calc_* y eff_*)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(run_line_id, version)
);

-- 5) Auditoría de cambios (extensión de audit_logs existente)
-- La tabla audit_logs ya existe, solo agregamos índices específicos

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_payroll_runs_company ON payroll_runs(company_uuid);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll_runs(year, month, quincena);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);

CREATE INDEX IF NOT EXISTS idx_prl_run ON payroll_run_lines(run_id);
CREATE INDEX IF NOT EXISTS idx_prl_company ON payroll_run_lines(company_uuid);
CREATE INDEX IF NOT EXISTS idx_prl_employee ON payroll_run_lines(employee_id);

CREATE INDEX IF NOT EXISTS idx_adj_line ON payroll_adjustments(run_line_id);
CREATE INDEX IF NOT EXISTS idx_adj_company ON payroll_adjustments(company_uuid);
CREATE INDEX IF NOT EXISTS idx_adj_user ON payroll_adjustments(user_id);

CREATE INDEX IF NOT EXISTS idx_snap_line ON payroll_snapshots(run_line_id);
CREATE INDEX IF NOT EXISTS idx_snap_company ON payroll_snapshots(company_uuid);
CREATE INDEX IF NOT EXISTS idx_snap_version ON payroll_snapshots(version);

-- RLS Policies (mantener consistencia con sistema existente)
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_run_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_snapshots ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (se pueden refinar después)
CREATE POLICY "Users can view payroll runs in their company" ON payroll_runs
    FOR SELECT USING (company_uuid IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Company admins and HR managers can manage payroll runs" ON payroll_runs
    FOR ALL USING (company_uuid IN (
        SELECT company_id FROM user_profiles 
        WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager')
    ));

CREATE POLICY "Users can view payroll lines in their company" ON payroll_run_lines
    FOR SELECT USING (company_uuid IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Company admins and HR managers can manage payroll lines" ON payroll_run_lines
    FOR ALL USING (company_uuid IN (
        SELECT company_id FROM user_profiles 
        WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager')
    ));

CREATE POLICY "Users can view adjustments in their company" ON payroll_adjustments
    FOR SELECT USING (company_uuid IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Company admins and HR managers can create adjustments" ON payroll_adjustments
    FOR INSERT WITH CHECK (company_uuid IN (
        SELECT company_id FROM user_profiles 
        WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager')
    ));

CREATE POLICY "Users can view snapshots in their company" ON payroll_snapshots
    FOR SELECT USING (company_uuid IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
    ));

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_payroll_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_payroll_runs_updated_at 
    BEFORE UPDATE ON payroll_runs 
    FOR EACH ROW EXECUTE FUNCTION update_payroll_updated_at();

CREATE TRIGGER update_payroll_run_lines_updated_at 
    BEFORE UPDATE ON payroll_run_lines 
    FOR EACH ROW EXECUTE FUNCTION update_payroll_updated_at();
