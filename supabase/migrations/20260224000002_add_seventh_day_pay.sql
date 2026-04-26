-- Migration: Add seventh_day_pay column for Séptimo Día (Art. 338-340 Honduras)
-- Date: 2026-02-24
-- Description: Columna explícita para auditoría del pago del Séptimo Día (empleados por hora).
--              Reemplaza/ complementa metadata.septimo_dia para consultas y reportes claros.

-- payroll_records (usado por calculate.ts y portal empleado)
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS
  seventh_day_pay DECIMAL(10,2) DEFAULT 0
  CHECK (seventh_day_pay >= 0);

COMMENT ON COLUMN payroll_records.seventh_day_pay IS 'Pago del Séptimo Día (Art. 338-340 Honduras). Solo aplica a empleados pay_type=hourly. 1 día descanso por cada 6 trabajados = 8h a tarifa base.';

-- payroll_run_lines (usado por preview y voucher)
ALTER TABLE payroll_run_lines ADD COLUMN IF NOT EXISTS
  seventh_day_pay DECIMAL(10,2) DEFAULT 0
  CHECK (seventh_day_pay >= 0);

COMMENT ON COLUMN payroll_run_lines.seventh_day_pay IS 'Pago del Séptimo Día (Art. 338-340 Honduras). Solo aplica a empleados pay_type=hourly. Incluido en eff_bruto.';
