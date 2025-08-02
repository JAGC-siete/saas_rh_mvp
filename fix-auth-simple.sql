-- SQL simplificado para arreglar autenticación sin tocar auth.users
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar políticas problemáticas que causan recursión
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Company admins can manage user profiles in their company" ON user_profiles;
DROP POLICY IF EXISTS "Users can view employees in their company" ON employees;
DROP POLICY IF EXISTS "Super admins can view all employees" ON employees;
DROP POLICY IF EXISTS "Users can view payroll in their company" ON payroll_records;
DROP POLICY IF EXISTS "Super admins can view all payroll" ON payroll_records;

-- 2. Crear políticas simples y seguras
-- Política para que usuarios puedan ver su propio perfil
CREATE POLICY "Users can view own profile"
ON user_profiles
FOR SELECT
USING (auth.uid() = id);

-- Política para que usuarios puedan insertar su propio perfil
CREATE POLICY "Users can insert own profile"
ON user_profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Política para que usuarios puedan actualizar su propio perfil
CREATE POLICY "Users can update own profile"
ON user_profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. Políticas para employees (sin restricción de empresa para super admins)
CREATE POLICY "Users can view employees in their company"
ON employees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.company_id = employees.company_id
  )
);

-- Política para super admins (pueden ver todos los empleados)
CREATE POLICY "Super admins can view all employees"
ON employees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.role = 'super_admin'
  )
);

-- 4. Políticas para payroll_records
CREATE POLICY "Users can view payroll in their company"
ON payroll_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.company_id = (
      SELECT company_id FROM employees WHERE id = payroll_records.employee_id
    )
  )
);

-- Política para super admins (pueden ver toda la nómina)
CREATE POLICY "Super admins can view all payroll"
ON payroll_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.role = 'super_admin'
  )
);

-- 5. Verificar que RLS esté habilitado
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;

-- 6. Crear perfil para jorge7gomez@gmail.com manualmente
INSERT INTO user_profiles (
  id,
  role,
  is_active,
  permissions,
  created_at,
  updated_at
) 
SELECT 
  id,
  'super_admin',
  true,
  '{
    "can_manage_employees": true,
    "can_view_payroll": true,
    "can_manage_attendance": true,
    "can_manage_departments": true,
    "can_view_reports": true,
    "can_manage_companies": true,
    "can_generate_payroll": true,
    "can_export_payroll": true,
    "can_view_own_attendance": true,
    "can_register_attendance": true
  }'::jsonb,
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'jorge7gomez@gmail.com'
ON CONFLICT (id) 
DO UPDATE SET
  role = 'super_admin',
  is_active = true,
  permissions = '{
    "can_manage_employees": true,
    "can_view_payroll": true,
    "can_manage_attendance": true,
    "can_manage_departments": true,
    "can_view_reports": true,
    "can_manage_companies": true,
    "can_generate_payroll": true,
    "can_export_payroll": true,
    "can_view_own_attendance": true,
    "can_register_attendance": true
  }'::jsonb,
  updated_at = NOW();

-- 7. Verificar el resultado
SELECT 
  'Perfil creado/actualizado' as status,
  up.id,
  up.role,
  up.company_id,
  up.is_active,
  au.email,
  up.created_at,
  up.updated_at
FROM user_profiles up
JOIN auth.users au ON up.id = au.id
WHERE au.email = 'jorge7gomez@gmail.com';

-- 8. Verificar políticas RLS
SELECT 
  'Políticas RLS para user_profiles' as info,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'user_profiles'
AND schemaname = 'public'; 