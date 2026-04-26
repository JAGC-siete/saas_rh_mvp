-- Migration: Ensure sync_status column exists in employees table
-- Date: 2025-12-09
-- Description: Idempotent migration to add sync_status column if it doesn't exist
-- This fixes the error: Could not find the 'sync_status' column of 'employees' in the schema cache

DO $$
BEGIN
  -- Check if sync_status column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'employees' 
      AND column_name = 'sync_status'
  ) THEN
    -- Add the column if it doesn't exist
    ALTER TABLE public.employees
    ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'not_synced';
    
    -- Create index on the new column
    CREATE INDEX IF NOT EXISTS idx_employees_sync_status ON public.employees(sync_status);
    
    -- Add comment
    COMMENT ON COLUMN public.employees.sync_status IS 'Tracks the synchronization status of the employee with external devices like biometric scanners.';
    
    RAISE NOTICE 'Added sync_status column to employees table';
  ELSE
    RAISE NOTICE 'sync_status column already exists in employees table';
  END IF;
END $$;

