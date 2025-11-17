-- Add super_admin policies for security and system tables
-- This migration adds policies to allow super admins to access sessions and job executions

-- =========================================
-- JOB_EXECUTIONS: Super admin full access
-- =========================================

-- Super admin can view all job executions
DROP POLICY IF EXISTS "Super admins can view all job executions" ON job_executions;
CREATE POLICY "Super admins can view all job executions" ON job_executions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'super_admin'
    )
  );

-- Super admin can manage job executions (for cleanup/management)
DROP POLICY IF EXISTS "Super admins can manage job executions" ON job_executions;
CREATE POLICY "Super admins can manage job executions" ON job_executions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'super_admin'
    )
  );

-- =========================================
-- USER_SESSIONS: Super admin full access (if table exists)
-- =========================================

-- Check if user_sessions table exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_sessions'
  ) THEN
    -- Super admin can view all user sessions
    DROP POLICY IF EXISTS "Super admins can view all user sessions" ON user_sessions;
    CREATE POLICY "Super admins can view all user sessions" ON user_sessions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE user_profiles.id = auth.uid() 
          AND user_profiles.role = 'super_admin'
        )
      );

    -- Super admin can revoke user sessions
    DROP POLICY IF EXISTS "Super admins can delete user sessions" ON user_sessions;
    CREATE POLICY "Super admins can delete user sessions" ON user_sessions
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE user_profiles.id = auth.uid() 
          AND user_profiles.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- =========================================
-- AUDIT_LOGS: Super admin full access (if table exists)
-- =========================================

-- Check if audit_logs table exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_logs'
  ) THEN
    -- Super admin can view all audit logs
    DROP POLICY IF EXISTS "Super admins can view all audit logs" ON audit_logs;
    CREATE POLICY "Super admins can view all audit logs" ON audit_logs
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
-- SYSTEM_LOGS: Super admin full access (if table exists)
-- =========================================

-- Check if system_logs table exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'system_logs'
  ) THEN
    -- Super admin can view all system logs
    DROP POLICY IF EXISTS "Super admins can view all system logs" ON system_logs;
    CREATE POLICY "Super admins can view all system logs" ON system_logs
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
COMMENT ON POLICY "Super admins can view all job executions" ON job_executions IS 
  'Allows super admins to view all job execution history';
COMMENT ON POLICY "Super admins can manage job executions" ON job_executions IS 
  'Allows super admins to manage job executions for cleanup and monitoring';

