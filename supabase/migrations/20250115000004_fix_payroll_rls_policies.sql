-- Migration: Fix Payroll RLS Policies for INSERT Operations
-- Date: 2025-01-15
-- Description: Adds specific INSERT policy for payroll_runs to fix RLS violation error

-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Company admins and HR managers can manage payroll runs" ON payroll_runs;

-- Create new, more granular policies for payroll_runs
-- 1. SELECT policy (mantener existente)
-- 2. INSERT policy for users with payroll permissions
-- 3. UPDATE policy for users with payroll permissions
-- 4. DELETE policy for admins only

-- Policy for INSERT operations - allows users with payroll permissions to create runs
CREATE POLICY "Users with payroll permissions can create payroll runs" ON payroll_runs
    FOR INSERT WITH CHECK (
        company_uuid IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid() 
            AND (
                role IN ('company_admin', 'hr_manager') 
                OR permissions ? 'can_generate_payroll'
            )
        )
    );

-- Policy for UPDATE operations - allows users with payroll permissions to modify runs
CREATE POLICY "Users with payroll permissions can update payroll runs" ON payroll_runs
    FOR UPDATE USING (
        company_uuid IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid() 
            AND (
                role IN ('company_admin', 'hr_manager') 
                OR permissions ? 'can_generate_payroll'
            )
        )
    ) WITH CHECK (
        company_uuid IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid() 
            AND (
                role IN ('company_admin', 'hr_manager') 
                OR permissions ? 'can_generate_payroll'
            )
        )
    );

-- Policy for DELETE operations - only admins can delete
CREATE POLICY "Only company admins can delete payroll runs" ON payroll_runs
    FOR DELETE USING (
        company_uuid IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('company_admin', 'super_admin')
        )
    );

-- Also fix the payroll_run_lines policies to be consistent
DROP POLICY IF EXISTS "Company admins and HR managers can manage payroll lines" ON payroll_run_lines;

CREATE POLICY "Users with payroll permissions can manage payroll lines" ON payroll_run_lines
    FOR ALL USING (
        company_uuid IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid() 
            AND (
                role IN ('company_admin', 'hr_manager') 
                OR permissions ? 'can_generate_payroll'
            )
        )
    );

-- Fix payroll_adjustments policies
DROP POLICY IF EXISTS "Company admins and HR managers can create adjustments" ON payroll_adjustments;

CREATE POLICY "Users with payroll permissions can manage adjustments" ON payroll_adjustments
    FOR ALL USING (
        company_uuid IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid() 
            AND (
                role IN ('company_admin', 'hr_manager') 
                OR permissions ? 'can_generate_payroll'
            )
        )
    );

-- Add comment explaining the changes
COMMENT ON TABLE payroll_runs IS 'RLS policies updated to allow INSERT operations for users with payroll permissions - 2025-01-15';
COMMENT ON TABLE payroll_run_lines IS 'RLS policies updated to be consistent with payroll_runs - 2025-01-15';
COMMENT ON TABLE payroll_adjustments IS 'RLS policies updated to be consistent with payroll_runs - 2025-01-15';
