-- Migration: Add sync_status to employees table
-- Date: 2025-11-30

-- 1. Add the new column `sync_status` to the employees table
ALTER TABLE public.employees
ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'not_synced';

-- 2. Create an index on the new column for faster queries
CREATE INDEX IF NOT EXISTS idx_employees_sync_status ON public.employees(sync_status);

-- 3. Add a comment to describe the purpose of the column
COMMENT ON COLUMN public.employees.sync_status IS 'Tracks the synchronization status of the employee with external devices like biometric scanners.';

