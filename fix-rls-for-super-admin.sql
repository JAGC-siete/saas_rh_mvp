-- ARREGLAR POLÍTICAS RLS PARA SUPER_ADMIN (2 MINUTOS)
-- Ejecutar en Supabase SQL Editor

-- 1. ARREGLAR políticas RLS para que super_admin tenga bypass
-- Para employees
DROP POLICY IF EXISTS "super_admin_bypass_employees" ON employees;
CREATE POLICY "super_admin_bypass_employees" ON employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Para companies  
DROP POLICY IF EXISTS "super_admin_bypass_companies" ON companies;
CREATE POLICY "super_admin_bypass_companies" ON companies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Para departments
DROP POLICY IF EXISTS "super_admin_bypass_departments" ON departments;
CREATE POLICY "super_admin_bypass_departments" ON departments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Para attendance_records
DROP POLICY IF EXISTS "super_admin_bypass_attendance" ON attendance_records;
CREATE POLICY "super_admin_bypass_attendance" ON attendance_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Para payroll_records
DROP POLICY IF EXISTS "super_admin_bypass_payroll" ON payroll_records;
CREATE POLICY "super_admin_bypass_payroll" ON payroll_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- 2. Verificar que se crearon
SELECT '✅ POLÍTICAS RLS ARREGLADAS PARA SUPER_ADMIN' as status;
