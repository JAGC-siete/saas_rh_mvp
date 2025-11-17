-- Add super_admin policies for engagement analytics tables
-- This migration adds policies to allow super admins to access gamification, leave, and attendance data

-- =========================================
-- EMPLOYEE_SCORES: Super admin full access
-- =========================================

-- Super admin can view all employee scores
DROP POLICY IF EXISTS "Super admins can view all employee scores" ON employee_scores;
CREATE POLICY "Super admins can view all employee scores" ON employee_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'super_admin'
    )
  );

-- Super admin can manage employee scores
DROP POLICY IF EXISTS "Super admins can manage employee scores" ON employee_scores;
CREATE POLICY "Super admins can manage employee scores" ON employee_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'super_admin'
    )
  );

-- =========================================
-- EMPLOYEE_ACHIEVEMENTS: Super admin full access
-- =========================================

DROP POLICY IF EXISTS "Super admins can view all achievements" ON employee_achievements;
CREATE POLICY "Super admins can view all achievements" ON employee_achievements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'super_admin'
    )
  );

-- =========================================
-- LEAVE_REQUESTS: Super admin full access
-- =========================================

DROP POLICY IF EXISTS "Super admins can view all leave requests" ON leave_requests;
CREATE POLICY "Super admins can view all leave requests" ON leave_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Super admins can manage leave requests" ON leave_requests;
CREATE POLICY "Super admins can manage leave requests" ON leave_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'super_admin'
    )
  );

-- =========================================
-- ATTENDANCE_RECORDS: Super admin full access
-- =========================================

DROP POLICY IF EXISTS "Super admins can view all attendance" ON attendance_records;
CREATE POLICY "Super admins can view all attendance" ON attendance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Super admins can manage attendance" ON attendance_records;
CREATE POLICY "Super admins can manage attendance" ON attendance_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'super_admin'
    )
  );

-- Add helpful comments
COMMENT ON POLICY "Super admins can view all employee scores" ON employee_scores IS 
  'Allows super admins to view gamification scores for all employees across companies';
COMMENT ON POLICY "Super admins can view all leave requests" ON leave_requests IS 
  'Allows super admins to view and manage leave requests for all companies';
COMMENT ON POLICY "Super admins can view all attendance" ON attendance_records IS 
  'Allows super admins to view attendance records for all employees';

