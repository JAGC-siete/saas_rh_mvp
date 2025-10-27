-- Migration: Add metadata column to payroll_run_lines for client-specific fields
-- Date: 2025-01-28
-- Description: Adds metadata JSONB column to store client-specific payroll fields
--              without affecting other clients or changing the core table structure

-- Add metadata column to payroll_run_lines
ALTER TABLE payroll_run_lines 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for metadata queries
CREATE INDEX IF NOT EXISTS idx_payroll_run_lines_metadata 
ON payroll_run_lines USING GIN (metadata);

-- Add comment explaining usage
COMMENT ON COLUMN payroll_run_lines.metadata IS 
'Client-specific payroll fields stored as JSON. Different clients can have different field structures without affecting the core schema. Example: {"bonus": 500, "overtime_rate": 1.5, "special_deduction": 200}';

-- Example: How to use metadata for client-specific fields
-- For PROHALCA (company_id: 4dc1c9de-dd12-4e4b-b76a-783d4ee5d07c):
-- UPDATE payroll_run_lines 
-- SET metadata = jsonb_build_object(
--   'feriado_trabajado', 150.00,
--   'horas_extras', 4.00,
--   'descanso_por_turno_noche', true
-- )
-- WHERE id = 'line_id' AND company_id = '4dc1c9de-dd12-4e4b-b76a-783d4ee5d07c';

-- For querying client-specific fields:
-- SELECT 
--   *,
--   metadata->'feriado_trabajado' as feriado_trabajado,
--   metadata->'horas_extras' as horas_extras
-- FROM payroll_run_lines
-- WHERE company_id = '4dc1c9de-dd12-4e4b-b76a-783d4ee5d07c';

