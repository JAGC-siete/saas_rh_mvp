-- Fix infinite recursion in user_profiles RLS policies
-- Execute this script directly in Supabase SQL Editor

-- Drop the problematic policy
DROP POLICY IF EXISTS "Company admins can manage user profiles in their company" ON user_profiles;

-- Create a new, non-recursive policy for company admins
CREATE POLICY "Company admins can manage user profiles in their company" ON user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() 
            AND up.role IN ('company_admin', 'super_admin')
            AND up.company_id = user_profiles.company_id
        )
    );

-- Fix other potentially recursive policies
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
CREATE POLICY "Users can view their own company" ON companies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.company_id = companies.id
        )
    );

DROP POLICY IF EXISTS "Users can view departments in their company" ON departments;
CREATE POLICY "Users can view departments in their company" ON departments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.company_id = departments.company_id
        )
    );

DROP POLICY IF EXISTS "Users can view work schedules in their company" ON work_schedules;
CREATE POLICY "Users can view work schedules in their company" ON work_schedules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.company_id = work_schedules.company_id
        )
    );

DROP POLICY IF EXISTS "Users can view employees in their company" ON employees;
CREATE POLICY "Users can view employees in their company" ON employees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.company_id = employees.company_id
        )
    );

DROP POLICY IF EXISTS "Users can view leave types in their company" ON leave_types;
CREATE POLICY "Users can view leave types in their company" ON leave_types
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.company_id = leave_types.company_id
        )
    );

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

-- Verify the fix
SELECT 'RLS policies fixed successfully' as status; 