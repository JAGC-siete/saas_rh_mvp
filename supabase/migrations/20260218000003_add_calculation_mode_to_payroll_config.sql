-- Migration: Add calculation_mode and incomplete_record_default_hours to company_payroll_configs
-- Date: 2026-02-18
-- Description: Método de cálculo de salario (Por Día vs Por Hora Exacta) y fallback para marcas huérfanas.

ALTER TABLE company_payroll_configs ADD COLUMN IF NOT EXISTS
  calculation_mode TEXT DEFAULT 'daily'
  CHECK (calculation_mode IS NULL OR calculation_mode IN ('daily', 'hourly'));

ALTER TABLE company_payroll_configs ADD COLUMN IF NOT EXISTS
  incomplete_record_default_hours DECIMAL(4,2)
  CHECK (incomplete_record_default_hours IS NULL OR (incomplete_record_default_hours >= 0 AND incomplete_record_default_hours <= 24));

COMMENT ON COLUMN company_payroll_configs.calculation_mode IS 'Método de cálculo: daily = pago por día (asistencia), hourly = por hora exacta. Override por employees.pay_type.';
COMMENT ON COLUMN company_payroll_configs.incomplete_record_default_hours IS 'Horas por defecto cuando falta check_out (solo si calculation_mode=hourly). NULL = no asignar, alertar para corrección manual.';
