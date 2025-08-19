-- Migration: Enhance Leave RLS Policies
-- Date: 2025-08-05
-- Description: Improve RLS policies for leave_requests to include super_admin and more granular role-based access

-- Drop existing policies for leave_requests
DROP POLICY IF EXISTS "Users can view leave requests in their company" ON leave_requests;
DROP POLICY IF EXISTS "Employees can manage their own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Managers can approve leave requests in their department" ON leave_requests;

-- Create enhanced policies for leave_requests

-- 1. Super admin can access all leave requests
CREATE POLICY "super_admin_can_access_all_leave_requests" ON leave_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() 
            AND up.role = 'super_admin'
        )
    );

-- 2. Company admins and HR managers can view all leave requests in their company
CREATE POLICY "company_admins_hr_managers_can_view_company_leave_requests" ON leave_requests
    FOR SELECT USING (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN user_profiles up ON up.company_id = e.company_id
            WHERE up.id = auth.uid() 
            AND up.role IN ('company_admin', 'hr_manager')
        )
    );

-- 3. Company admins and HR managers can create leave requests in their company
CREATE POLICY "company_admins_hr_managers_can_create_company_leave_requests" ON leave_requests
    FOR INSERT WITH CHECK (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN user_profiles up ON up.company_id = e.company_id
            WHERE up.id = auth.uid() 
            AND up.role IN ('company_admin', 'hr_manager')
        )
    );

-- 4. Company admins and HR managers can update leave requests in their company
CREATE POLICY "company_admins_hr_managers_can_update_company_leave_requests" ON leave_requests
    FOR UPDATE USING (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN user_profiles up ON up.company_id = e.company_id
            WHERE up.id = auth.uid() 
            AND up.role IN ('company_admin', 'hr_manager')
        )
    );

-- 5. Company admins and HR managers can delete leave requests in their company
CREATE POLICY "company_admins_hr_managers_can_delete_company_leave_requests" ON leave_requests
    FOR DELETE USING (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN user_profiles up ON up.company_id = e.company_id
            WHERE up.id = auth.uid() 
            AND up.role IN ('company_admin', 'hr_manager')
        )
    );

-- 6. Managers can view leave requests in their department
CREATE POLICY "managers_can_view_department_leave_requests" ON leave_requests
    FOR SELECT USING (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN departments d ON d.id = e.department_id
            JOIN user_profiles up ON up.employee_id = d.manager_id
            WHERE up.id = auth.uid() 
            AND up.role = 'manager'
        )
    );

-- 7. Managers can update leave requests in their department (approve/reject)
CREATE POLICY "managers_can_update_department_leave_requests" ON leave_requests
    FOR UPDATE USING (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN departments d ON d.id = e.department_id
            JOIN user_profiles up ON up.employee_id = d.manager_id
            WHERE up.id = auth.uid() 
            AND up.role = 'manager'
        )
    );

-- 8. Employees can view their own leave requests
CREATE POLICY "employees_can_view_own_leave_requests" ON leave_requests
    FOR SELECT USING (
        employee_id IN (
            SELECT employee_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
    );

-- 9. Employees can create their own leave requests
CREATE POLICY "employees_can_create_own_leave_requests" ON leave_requests
    FOR INSERT WITH CHECK (
        employee_id IN (
            SELECT employee_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
    );

-- 10. Employees can update their own leave requests (only if pending)
CREATE POLICY "employees_can_update_own_pending_leave_requests" ON leave_requests
    FOR UPDATE USING (
        employee_id IN (
            SELECT employee_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
        AND status = 'pending'
    );

-- Enhanced policies for leave_types

-- Drop existing policies for leave_types
DROP POLICY IF EXISTS "Users can view leave types in their company" ON leave_types;
DROP POLICY IF EXISTS "Company admins and HR managers can manage leave types" ON leave_types;

-- 1. Super admin can access all leave types
CREATE POLICY "super_admin_can_access_all_leave_types" ON leave_types
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() 
            AND up.role = 'super_admin'
        )
    );

-- 2. Company admins and HR managers can view leave types in their company
CREATE POLICY "company_admins_hr_managers_can_view_company_leave_types" ON leave_types
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
            AND role IN ('company_admin', 'hr_manager')
        )
    );

-- 3. Company admins and HR managers can create leave types in their company
CREATE POLICY "company_admins_hr_managers_can_create_company_leave_types" ON leave_types
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
            AND role IN ('company_admin', 'hr_manager')
        )
    );

-- 4. Company admins and HR managers can update leave types in their company
CREATE POLICY "company_admins_hr_managers_can_update_company_leave_types" ON leave_types
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
            AND role IN ('company_admin', 'hr_manager')
        )
    );

-- 5. Company admins and HR managers can delete leave types in their company
CREATE POLICY "company_admins_hr_managers_can_delete_company_leave_types" ON leave_types
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
            AND role IN ('company_admin', 'hr_manager')
        )
    );

-- Add comment to document the enhanced policies
COMMENT ON TABLE leave_requests IS 'Employee leave requests with enhanced RLS policies for super_admin, company_admin, hr_manager, manager, and employee roles';
COMMENT ON TABLE leave_types IS 'Leave types with enhanced RLS policies for super_admin, company_admin, and hr_manager roles';
