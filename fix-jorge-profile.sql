-- Script específico para jorge7gomez@gmail.com
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar si existe el usuario
SELECT 
  'Usuario en auth.users' as status,
  id,
  email,
  created_at
FROM auth.users 
WHERE email = 'jorge7gomez@gmail.com';

-- 2. Verificar perfil actual
SELECT 
  'Perfil actual' as status,
  id,
  role,
  company_id,
  is_active,
  permissions,
  created_at
FROM user_profiles 
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'jorge7gomez@gmail.com'
);

-- 3. Crear o actualizar perfil con todos los permisos
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

-- 4. Verificar el resultado final
SELECT 
  'Perfil actualizado' as status,
  up.id,
  up.role,
  up.company_id,
  up.is_active,
  up.permissions,
  au.email,
  up.created_at,
  up.updated_at
FROM user_profiles up
JOIN auth.users au ON up.id = au.id
WHERE au.email = 'jorge7gomez@gmail.com';

-- 5. Verificar que las políticas RLS permiten acceso
SELECT 
  'Políticas RLS para user_profiles' as info,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'user_profiles'
AND schemaname = 'public';

-- 6. Contar registros para verificar acceso
SELECT 
  'Conteo de registros' as info,
  'user_profiles' as table_name,
  COUNT(*) as count
FROM user_profiles
UNION ALL
SELECT 
  'Conteo de registros' as info,
  'employees' as table_name,
  COUNT(*) as count
FROM employees
UNION ALL
SELECT 
  'Conteo de registros' as info,
  'payroll_records' as table_name,
  COUNT(*) as count
FROM payroll_records; 