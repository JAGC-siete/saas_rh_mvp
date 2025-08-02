-- Fix temporal para funcionar sin empresas
-- Ejecutar esto en Supabase SQL Editor

-- 1. Deshabilitar RLS temporalmente
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE work_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- 2. Eliminar todas las políticas que dependen de company_id
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can view departments in their company" ON departments;
DROP POLICY IF EXISTS "Users can view work schedules in their company" ON work_schedules;
DROP POLICY IF EXISTS "Users can view employees in their company" ON employees;
DROP POLICY IF EXISTS "Users can view leave types in their company" ON leave_types;
DROP POLICY IF EXISTS "Users can view audit logs in their company" ON audit_logs;
DROP POLICY IF EXISTS "Company admins can manage user profiles in their company" ON user_profiles;

-- 3. Crear políticas simples que no dependan de empresas
-- User profiles - solo autenticación básica
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Companies - permitir todo por ahora
CREATE POLICY "Allow all companies" ON companies
    FOR ALL USING (true);

-- Departments - permitir todo por ahora
CREATE POLICY "Allow all departments" ON departments
    FOR ALL USING (true);

-- Employees - permitir todo por ahora
CREATE POLICY "Allow all employees" ON employees
    FOR ALL USING (true);

-- Work schedules - permitir todo por ahora
CREATE POLICY "Allow all work schedules" ON work_schedules
    FOR ALL USING (true);

-- Leave types - permitir todo por ahora
CREATE POLICY "Allow all leave types" ON leave_types
    FOR ALL USING (true);

-- Audit logs - permitir todo por ahora
CREATE POLICY "Allow all audit logs" ON audit_logs
    FOR ALL USING (true);

-- 4. Rehabilitar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Crear perfil básico para el usuario actual
INSERT INTO user_profiles (id, role, is_active)
SELECT 
    auth.uid(),
    'super_admin',
    true
WHERE auth.uid() IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- 6. Verificar que funciona
SELECT 'System configured for no companies' as status;
SELECT COUNT(*) as user_count FROM user_profiles WHERE id = auth.uid();
SELECT * FROM user_profiles WHERE id = auth.uid(); 