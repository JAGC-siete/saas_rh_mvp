-- Row Level Security Policies for Multi-tenancy

-- Companies policies
CREATE POLICY "Users can view their own company" ON companies
    FOR SELECT USING (
        id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
    );

CREATE POLICY "Super admins can manage companies" ON companies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Departments policies
CREATE POLICY "Users can view departments in their company" ON departments
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
    );

CREATE POLICY "Company admins and HR managers can manage departments" ON departments
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND role IN ('company_admin', 'hr_manager')
        )
    );

-- Work schedules policies
CREATE POLICY "Users can view work schedules in their company" ON work_schedules
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
    );

CREATE POLICY "Company admins and HR managers can manage work schedules" ON work_schedules
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND role IN ('company_admin', 'hr_manager')
        )
    );

-- Employees policies
CREATE POLICY "Users can view employees in their company" ON employees
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
    );

CREATE POLICY "Employees can update their own profile" ON employees
    FOR UPDATE USING (
        id IN (
            SELECT employee_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
    );

CREATE POLICY "Company admins and HR managers can manage employees" ON employees
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND role IN ('company_admin', 'hr_manager')
        )
    );

-- Attendance records policies
CREATE POLICY "Users can view attendance in their company" ON attendance_records
    FOR SELECT USING (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN user_profiles up ON up.company_id = e.company_id
            WHERE up.id = auth.uid()
        )
    );

CREATE POLICY "Employees can insert their own attendance" ON attendance_records
    FOR INSERT WITH CHECK (
        employee_id IN (
            SELECT employee_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
    );

CREATE POLICY "Company admins and HR managers can manage attendance" ON attendance_records
    FOR ALL USING (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN user_profiles up ON up.company_id = e.company_id
            WHERE up.id = auth.uid() 
            AND up.role IN ('company_admin', 'hr_manager')
        )
    );

-- Leave types policies
CREATE POLICY "Users can view leave types in their company" ON leave_types
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
    );

CREATE POLICY "Company admins and HR managers can manage leave types" ON leave_types
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND role IN ('company_admin', 'hr_manager')
        )
    );

-- Leave requests policies
CREATE POLICY "Users can view leave requests in their company" ON leave_requests
    FOR SELECT USING (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN user_profiles up ON up.company_id = e.company_id
            WHERE up.id = auth.uid()
        )
    );

CREATE POLICY "Employees can manage their own leave requests" ON leave_requests
    FOR ALL USING (
        employee_id IN (
            SELECT employee_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
    );

CREATE POLICY "Managers can approve leave requests in their department" ON leave_requests
    FOR UPDATE USING (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN departments d ON d.id = e.department_id
            JOIN user_profiles up ON up.employee_id = d.manager_id
            WHERE up.id = auth.uid()
        )
    );

-- Payroll records policies
CREATE POLICY "Employees can view their own payroll" ON payroll_records
    FOR SELECT USING (
        employee_id IN (
            SELECT employee_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
    );

CREATE POLICY "Company admins and HR managers can manage payroll" ON payroll_records
    FOR ALL USING (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN user_profiles up ON up.company_id = e.company_id
            WHERE up.id = auth.uid() 
            AND up.role IN ('company_admin', 'hr_manager')
        )
    );

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Company admins can manage user profiles in their company" ON user_profiles
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND role IN ('company_admin', 'super_admin')
        )
    );

-- Audit logs policies
CREATE POLICY "Users can view audit logs in their company" ON audit_logs
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND role IN ('company_admin', 'hr_manager')
        )
    );

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);
