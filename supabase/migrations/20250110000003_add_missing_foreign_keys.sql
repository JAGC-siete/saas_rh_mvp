-- Add missing foreign key constraints for payroll_run_lines table
-- This fixes the PGRST200 error when PostgREST tries to join payroll_run_lines with employees

-- Add foreign key constraint for employee_id
ALTER TABLE payroll_run_lines 
ADD CONSTRAINT payroll_run_lines_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- Add foreign key constraint for company_uuid
ALTER TABLE payroll_run_lines 
ADD CONSTRAINT payroll_run_lines_company_uuid_fkey 
FOREIGN KEY (company_uuid) REFERENCES companies(id) ON DELETE CASCADE;

-- Add foreign key constraint for payroll_runs created_by
ALTER TABLE payroll_runs 
ADD CONSTRAINT payroll_runs_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- Add missing foreign key constraints for payroll_adjustments
ALTER TABLE payroll_adjustments 
ADD CONSTRAINT payroll_adjustments_company_uuid_fkey 
FOREIGN KEY (company_uuid) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE payroll_adjustments 
ADD CONSTRAINT payroll_adjustments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- Add missing foreign key constraint for payroll_snapshots
ALTER TABLE payroll_snapshots 
ADD CONSTRAINT payroll_snapshots_company_uuid_fkey 
FOREIGN KEY (company_uuid) REFERENCES companies(id) ON DELETE CASCADE;
