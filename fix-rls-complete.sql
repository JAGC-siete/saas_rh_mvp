-- Fix completo para recursión infinita en RLS policies
-- Ejecutar esto en Supabase SQL Editor

-- 1. Deshabilitar RLS temporalmente para user_profiles
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar TODAS las políticas problemáticas
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Company admins can manage user profiles in their company" ON user_profiles;

-- 3. Eliminar políticas recursivas en otras tablas
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can view departments in their company" ON departments;
DROP POLICY IF EXISTS "Users can view work schedules in their company" ON work_schedules;
DROP POLICY IF EXISTS "Users can view employees in their company" ON employees;
DROP POLICY IF EXISTS "Users can view leave types in their company" ON leave_types;
DROP POLICY IF EXISTS "Users can view audit logs in their company" ON audit_logs;

-- 4. Recrear políticas simples y no recursivas
-- User profiles - políticas básicas
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid());

-- Companies - política simple
CREATE POLICY "Users can view their own company" ON companies
    FOR SELECT USING (
        id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Departments - política simple
CREATE POLICY "Users can view departments in their company" ON departments
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Employees - política simple
CREATE POLICY "Users can view employees in their company" ON employees
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Work schedules - política simple
CREATE POLICY "Users can view work schedules in their company" ON work_schedules
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Leave types - política simple
CREATE POLICY "Users can view leave types in their company" ON leave_types
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Audit logs - política simple
CREATE POLICY "Users can view audit logs in their company" ON audit_logs
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- 5. Rehabilitar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 6. Verificar que funciona
SELECT 'RLS policies fixed - testing query' as status;
SELECT COUNT(*) as user_count FROM user_profiles WHERE id = auth.uid(); 