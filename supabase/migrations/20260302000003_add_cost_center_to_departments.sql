-- Migration: Add cost_center_type to departments
-- Date: 2026-03-02
-- Description: Classify departments as ventas, administracion, produccion for accounting routing

-- cost_center_type_enum already created in 20260302000002
ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS cost_center_type cost_center_type_enum;

CREATE INDEX IF NOT EXISTS idx_departments_cost_center ON departments(company_id, cost_center_type);

COMMENT ON COLUMN departments.cost_center_type IS 'Cost center for accounting: ventas (6101-01), administracion (6101-02), produccion (6101-03). NULL = use default.';
