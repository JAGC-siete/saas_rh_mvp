-- SOLUCIÓN DE EMERGENCIA - Romper recursión RLS
-- Ejecutar en Supabase SQL Editor

-- 1. DESACTIVAR RLS TEMPORALMENTE para romper la recursión
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records DISABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR TODAS LAS POLÍTICAS PROBLEMÁTICAS
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Company admins can manage user profiles in their company" ON user_profiles;
DROP POLICY IF EXISTS "Users can view employees in their company" ON employees;
DROP POLICY IF EXISTS "Super admins can view all employees" ON employees;
DROP POLICY IF EXISTS "Users can view payroll in their company" ON payroll_records;
DROP POLICY IF EXISTS "Super admins can view all payroll" ON payroll_records;

-- 3. CREAR PERFIL PARA JORGE MANUALMENTE (sin RLS)
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

-- 4. VERIFICAR QUE EL PERFIL SE CREÓ
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

-- 5. VERIFICAR QUE NO HAY POLÍTICAS RLS
SELECT 
  'Políticas RLS restantes' as info,
  tablename,
  policyname
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'employees', 'payroll_records');

-- 6. VERIFICAR ESTADO RLS
SELECT 
  'Estado RLS' as info,
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'employees', 'payroll_records')
AND schemaname = 'public'; 