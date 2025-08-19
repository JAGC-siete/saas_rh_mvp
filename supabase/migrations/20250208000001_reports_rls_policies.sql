-- Migración para implementar políticas RLS mejoradas para reports
-- Fecha: 2025-02-08
-- Descripción: Implementa políticas RLS granulares para todas las tablas relacionadas con reports

-- Habilitar RLS en todas las tablas relacionadas con reports
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para employees
DROP POLICY IF EXISTS "Employees are viewable by company users" ON employees;
CREATE POLICY "Employees are viewable by company users" ON employees
    FOR SELECT USING (
        company_id = (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('super_admin', 'system_admin')
        )
    );

DROP POLICY IF EXISTS "Employees are manageable by company admins" ON employees;
CREATE POLICY "Employees are manageable by company admins" ON employees
    FOR ALL USING (
        company_id = (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
        AND
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('company_admin', 'hr_manager')
        )
        OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('super_admin', 'system_admin')
        )
    );

-- Políticas RLS para attendance_records
DROP POLICY IF EXISTS "Attendance records are viewable by company users" ON attendance_records;
CREATE POLICY "Attendance records are viewable by company users" ON attendance_records
    FOR SELECT USING (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN user_profiles up ON up.company_id = e.company_id
            WHERE up.id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('super_admin', 'system_admin')
        )
    );

DROP POLICY IF EXISTS "Attendance records are manageable by company admins" ON attendance_records;
CREATE POLICY "Attendance records are manageable by company admins" ON attendance_records
    FOR ALL USING (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN user_profiles up ON up.company_id = e.company_id
            WHERE up.id = auth.uid() 
            AND up.role IN ('company_admin', 'hr_manager')
        )
        OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('super_admin', 'system_admin')
        )
    );

-- Políticas RLS para payroll_records
DROP POLICY IF EXISTS "Payroll records are viewable by company users" ON payroll_records;
CREATE POLICY "Payroll records are viewable by company users" ON payroll_records
    FOR SELECT USING (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN user_profiles up ON up.company_id = e.company_id
            WHERE up.id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('super_admin', 'system_admin')
        )
    );

DROP POLICY IF EXISTS "Payroll records are manageable by company admins" ON payroll_records;
CREATE POLICY "Payroll records are manageable by company admins" ON payroll_records
    FOR ALL USING (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN user_profiles up ON up.company_id = e.company_id
            WHERE up.id = auth.uid() 
            AND up.role IN ('company_admin', 'hr_manager')
        )
        OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('super_admin', 'system_admin')
        )
    );

-- Políticas RLS para leave_requests
DROP POLICY IF EXISTS "Leave requests are viewable by company users" ON leave_requests;
CREATE POLICY "Leave requests are viewable by company users" ON leave_requests
    FOR SELECT USING (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN user_profiles up ON up.company_id = e.company_id
            WHERE up.id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('super_admin', 'system_admin')
        )
    );

DROP POLICY IF EXISTS "Leave requests are manageable by company admins" ON leave_requests;
CREATE POLICY "Leave requests are manageable by company admins" ON leave_requests
    FOR ALL USING (
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN user_profiles up ON up.company_id = e.company_id
            WHERE up.id = auth.uid() 
            AND up.role IN ('company_admin', 'hr_manager')
        )
        OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('super_admin', 'system_admin')
        )
    );

-- Políticas RLS para departments
DROP POLICY IF EXISTS "Departments are viewable by company users" ON departments;
CREATE POLICY "Departments are viewable by company users" ON departments
    FOR SELECT USING (
        company_id = (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('super_admin', 'system_admin')
        )
    );

DROP POLICY IF EXISTS "Departments are manageable by company admins" ON departments;
CREATE POLICY "Departments are manageable by company admins" ON departments
    FOR ALL USING (
        company_id = (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
        AND
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('company_admin', 'hr_manager')
        )
        OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('super_admin', 'system_admin')
        )
    );

-- Políticas RLS para companies
DROP POLICY IF EXISTS "Companies are viewable by company users" ON companies;
CREATE POLICY "Companies are viewable by company users" ON companies
    FOR SELECT USING (
        id = (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('super_admin', 'system_admin')
        )
    );

DROP POLICY IF EXISTS "Companies are manageable by super admins" ON companies;
CREATE POLICY "Companies are manageable by super admins" ON companies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('super_admin', 'system_admin')
        )
    );

-- Política especial para super_admin que puede acceder a todo
CREATE POLICY "Super admin can access everything" ON employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'super_admin'
        )
    );

CREATE POLICY "Super admin can access everything" ON attendance_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'super_admin'
        )
    );

CREATE POLICY "Super admin can access everything" ON payroll_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'super_admin'
        )
    );

CREATE POLICY "Super admin can access everything" ON leave_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'super_admin'
        )
    );

CREATE POLICY "Super admin can access everything" ON departments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'super_admin'
        )
    );

CREATE POLICY "Super admin can access everything" ON companies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role = 'super_admin'
        )
    );

-- Crear índices para mejorar el rendimiento de las consultas con RLS
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_id ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_employee_id ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_departments_company_id ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON user_profiles(company_id);

-- Comentarios para documentar las políticas
COMMENT ON POLICY "Employees are viewable by company users" ON employees IS 'Permite a usuarios de la empresa ver empleados de su empresa';
COMMENT ON POLICY "Employees are manageable by company admins" ON employees IS 'Permite a administradores de la empresa gestionar empleados';
COMMENT ON POLICY "Super admin can access everything" ON employees IS 'Permite al super admin acceder a todo sin restricciones';

COMMENT ON POLICY "Attendance records are viewable by company users" ON attendance_records IS 'Permite a usuarios de la empresa ver registros de asistencia de su empresa';
COMMENT ON POLICY "Attendance records are manageable by company admins" ON attendance_records IS 'Permite a administradores de la empresa gestionar registros de asistencia';

COMMENT ON POLICY "Payroll records are viewable by company users" ON payroll_records IS 'Permite a usuarios de la empresa ver registros de nómina de su empresa';
COMMENT ON POLICY "Payroll records are manageable by company admins" ON payroll_records IS 'Permite a administradores de la empresa gestionar registros de nómina';

COMMENT ON POLICY "Leave requests are viewable by company users" ON leave_requests IS 'Permite a usuarios de la empresa ver solicitudes de permisos de su empresa';
COMMENT ON POLICY "Leave requests are manageable by company admins" ON leave_requests IS 'Permite a administradores de la empresa gestionar solicitudes de permisos';

COMMENT ON POLICY "Departments are viewable by company users" ON departments IS 'Permite a usuarios de la empresa ver departamentos de su empresa';
COMMENT ON POLICY "Departments are manageable by company admins" ON departments IS 'Permite a administradores de la empresa gestionar departamentos';

COMMENT ON POLICY "Companies are viewable by company users" ON companies IS 'Permite a usuarios ver información de su empresa';
COMMENT ON POLICY "Companies are manageable by super admins" ON companies IS 'Permite solo a super admins gestionar empresas';
