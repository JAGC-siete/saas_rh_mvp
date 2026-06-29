-- One-time: reopen Enlace Jun 2026 Q2 payroll so company_admin can edit days and re-authorize.
-- Run: 5886d95f-f2ca-4a77-9f5c-6aa0c353a1d6 (Enlace, c419b1a5-32de-4518-8ff2-e7ebd6318a9f)

UPDATE payroll_runs
SET
  status = 'edited',
  authorized_at = NULL,
  authorized_by = NULL,
  updated_at = NOW()
WHERE id = '5886d95f-f2ca-4a77-9f5c-6aa0c353a1d6'
  AND company_id = 'c419b1a5-32de-4518-8ff2-e7ebd6318a9f'
  AND status = 'authorized';
