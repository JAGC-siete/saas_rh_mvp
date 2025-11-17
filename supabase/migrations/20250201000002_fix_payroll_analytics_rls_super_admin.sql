-- Add super_admin policies for payroll analytics tables
-- This migration adds policies to allow super admins to access all payroll data across companies

-- =========================================
-- PAYROLL_RUNS: Super admin full access
-- =========================================

-- Super admin can view all payroll runs (across all companies)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'payroll_runs' 
    AND policyname = 'Super admins can view all payroll runs'
  ) THEN
    CREATE POLICY "Super admins can view all payroll runs" ON payroll_runs
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE user_profiles.id = auth.uid() 
          AND user_profiles.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- Super admin can manage all payroll runs (insert, update, delete)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'payroll_runs' 
    AND policyname = 'Super admins can manage all payroll runs'
  ) THEN
    CREATE POLICY "Super admins can manage all payroll runs" ON payroll_runs
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE user_profiles.id = auth.uid() 
          AND user_profiles.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- =========================================
-- PAYROLL_RUN_LINES: Super admin full access
-- =========================================

-- Super admin can view all payroll run lines (across all companies)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'payroll_run_lines' 
    AND policyname = 'Super admins can view all payroll lines'
  ) THEN
    CREATE POLICY "Super admins can view all payroll lines" ON payroll_run_lines
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE user_profiles.id = auth.uid() 
          AND user_profiles.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- Super admin can manage all payroll run lines
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'payroll_run_lines' 
    AND policyname = 'Super admins can manage all payroll lines'
  ) THEN
    CREATE POLICY "Super admins can manage all payroll lines" ON payroll_run_lines
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE user_profiles.id = auth.uid() 
          AND user_profiles.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- =========================================
-- PAYROLL_ADJUSTMENTS: Super admin full access (if table exists)
-- =========================================

-- Check if table exists before creating policy
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'payroll_adjustments'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'payroll_adjustments' 
    AND policyname = 'Super admins can view all adjustments'
  ) THEN
    CREATE POLICY "Super admins can view all adjustments" ON payroll_adjustments
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE user_profiles.id = auth.uid() 
          AND user_profiles.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- =========================================
-- PAYROLL_SNAPSHOTS: Super admin full access (if table exists)
-- =========================================

-- Check if table exists before creating policy
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'payroll_snapshots'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'payroll_snapshots' 
    AND policyname = 'Super admins can view all snapshots'
  ) THEN
    CREATE POLICY "Super admins can view all snapshots" ON payroll_snapshots
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE user_profiles.id = auth.uid() 
          AND user_profiles.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- Add helpful comments
COMMENT ON POLICY "Super admins can view all payroll runs" ON payroll_runs IS 
  'Allows super admins to view payroll runs for all companies';
COMMENT ON POLICY "Super admins can manage all payroll runs" ON payroll_runs IS 
  'Allows super admins to insert, update, and delete payroll runs for any company';
COMMENT ON POLICY "Super admins can view all payroll lines" ON payroll_run_lines IS 
  'Allows super admins to view payroll run lines for all companies';
COMMENT ON POLICY "Super admins can manage all payroll lines" ON payroll_run_lines IS 
  'Allows super admins to manage payroll run lines for any company';

