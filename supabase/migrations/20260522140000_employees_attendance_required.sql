-- Per-employee attendance obligation for payroll gates and KPI denominators.
-- true (default): must register attendance for fixed payroll inclusion; counted in absent KPIs.
-- false: fixed employee paid full period without punches; excluded from absent KPIs.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS attendance_required BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN employees.attendance_required IS
  'When false, fixed-salary employee is exempt from attendance gates (paid full period). Hourly employees should remain true. Excluded from absent KPIs when false.';
