-- Migration: Fix work_schedules RLS policy to support INSERT
-- Date: 2026-01-28
-- Description: Adds WITH CHECK clause to work_schedules policy to allow INSERT operations

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Company admins and HR managers can manage work schedules" ON work_schedules;

-- Recreate policy with both USING and WITH CHECK clauses
CREATE POLICY "Company admins and HR managers can manage work schedules" ON work_schedules
    FOR ALL 
    USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND role IN ('company_admin', 'hr_manager')
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND role IN ('company_admin', 'hr_manager')
        )
    );
