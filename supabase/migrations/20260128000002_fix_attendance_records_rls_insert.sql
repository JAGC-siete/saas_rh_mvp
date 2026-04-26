-- Migration: Fix attendance_records RLS policy to support INSERT
-- Date: 2026-01-28
-- Description: Adds WITH CHECK clause to attendance_records policies to allow INSERT operations

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Company admins and HR managers can manage attendance" ON attendance_records;

-- Recreate policy with both USING and WITH CHECK clauses
CREATE POLICY "Company admins and HR managers can manage attendance" ON attendance_records
    FOR ALL 
    USING (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN user_profiles up ON up.company_id = e.company_id
            WHERE up.id = auth.uid() 
            AND up.role IN ('company_admin', 'hr_manager')
        )
    )
    WITH CHECK (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN user_profiles up ON up.company_id = e.company_id
            WHERE up.id = auth.uid() 
            AND up.role IN ('company_admin', 'hr_manager')
        )
    );

-- NOTA: El service role key (SUPABASE_SERVICE_ROLE_KEY) bypassa RLS automáticamente.
-- Si createAdminClient() está usando service role key, no necesita políticas RLS.
-- Esta migración corrige el caso donde se usa anon key (fallback) que SÍ está sujeto a RLS.
