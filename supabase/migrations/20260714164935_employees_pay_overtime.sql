-- Per-employee overtime eligibility (Capa 2).
-- Company master switch: company_payroll_configs.metadata.pay_overtime
-- true (default): eligible — if company pays OT, hourly bruto includes OT amount.
-- false: OT may still appear in attendance/AHC, but does not impact this employee's bruto.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS pay_overtime BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN employees.pay_overtime IS
  'Capa 2 overtime eligibility. When false, overtime hours remain visible in attendance/AHC but do not impact bruto. Only applied when company metadata.pay_overtime is on; fixed/admin stay informational.';
