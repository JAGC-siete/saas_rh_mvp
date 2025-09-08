-- Migration: Fix Payroll Snapshots RLS Policies
-- Date: 2025-09-08
-- Description: Adds RLS policies for payroll_snapshots table to fix INSERT permission errors

-- Enable RLS on payroll_snapshots if not already enabled
ALTER TABLE payroll_snapshots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users with payroll permissions can manage payroll snapshots" ON payroll_snapshots;

-- Create comprehensive policy for payroll_snapshots
CREATE POLICY "Users with payroll permissions can manage payroll snapshots" ON payroll_snapshots
    FOR ALL USING (
        company_uuid IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid() 
            AND (
                role IN ('company_admin', 'hr_manager', 'super_admin') 
                OR permissions ? 'can_generate_payroll'
            )
        )
    ) WITH CHECK (
        company_uuid IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid() 
            AND (
                role IN ('company_admin', 'hr_manager', 'super_admin') 
                OR permissions ? 'can_generate_payroll'
            )
        )
    );

-- Add comment explaining the changes
COMMENT ON TABLE payroll_snapshots IS 'RLS policies added to allow payroll operations for users with payroll permissions - 2025-09-08';
