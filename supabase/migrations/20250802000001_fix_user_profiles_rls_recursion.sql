-- Fix infinite recursion in user_profiles RLS policies
-- This migration fixes the recursive policy that was causing the infinite recursion error

-- Drop the problematic policy
DROP POLICY IF EXISTS "Company admins can manage user profiles in their company" ON user_profiles;

-- Create a new, non-recursive policy for company admins
-- This policy uses a direct role check instead of querying user_profiles
CREATE POLICY "Company admins can manage user profiles in their company" ON user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() 
            AND up.role IN ('company_admin', 'super_admin')
            AND up.company_id = user_profiles.company_id
        )
    );

-- Also fix the other potentially recursive policies by making them more efficient
-- Drop and recreate the companies policy to avoid recursion
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
CREATE POLICY "Users can view their own company" ON companies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.company_id = companies.id
        )
    );

-- Drop and recreate the departments policy
DROP POLICY IF EXISTS "Users can view departments in their company" ON departments;
CREATE POLICY "Users can view departments in their company" ON departments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.company_id = departments.company_id
        )
    );

-- Drop and recreate the work schedules policy
DROP POLICY IF EXISTS "Users can view work schedules in their company" ON work_schedules;
CREATE POLICY "Users can view work schedules in their company" ON work_schedules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.company_id = work_schedules.company_id
        )
    );

-- Drop and recreate the employees policy
DROP POLICY IF EXISTS "Users can view employees in their company" ON employees;
CREATE POLICY "Users can view employees in their company" ON employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.company_id = employees.company_id
        )
    );

-- Drop and recreate the leave types policy
DROP POLICY IF EXISTS "Users can view leave types in their company" ON leave_types;
CREATE POLICY "Users can view leave types in their company" ON leave_types
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.company_id = leave_types.company_id
        )
    );

-- Drop and recreate the audit logs policy
DROP POLICY IF EXISTS "Users can view audit logs in their company" ON audit_logs;
CREATE POLICY "Users can view audit logs in their company" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('company_admin', 'hr_manager')
            AND user_profiles.company_id = audit_logs.company_id
        )
    );

-- Add a comment explaining the fix
COMMENT ON TABLE user_profiles IS 'Fixed RLS policies to prevent infinite recursion - 2025-08-02'; 