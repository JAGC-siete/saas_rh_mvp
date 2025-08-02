-- Script para verificar el estado de RLS
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar si RLS está habilitado en las tablas principales
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'companies', 'employees', 'attendance_records', 'payroll_records')
AND schemaname = 'public';

-- 2. Verificar todas las políticas RLS activas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'companies', 'employees', 'attendance_records', 'payroll_records')
ORDER BY tablename, policyname;

-- 3. Verificar permisos específicos para el usuario actual
SELECT 
  grantee,
  table_name,
  privilege_type
FROM information_schema.role_table_grants 
WHERE table_name IN ('user_profiles', 'companies', 'employees', 'attendance_records', 'payroll_records')
AND grantee = 'authenticated';

-- 4. Verificar si hay políticas que puedan causar recursión
SELECT 
  tablename,
  policyname,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
AND qual LIKE '%user_profiles%'
AND tablename != 'user_profiles';

-- 5. Contar registros en cada tabla (para verificar acceso)
SELECT 
  'user_profiles' as table_name,
  COUNT(*) as record_count
FROM user_profiles
UNION ALL
SELECT 
  'companies' as table_name,
  COUNT(*) as record_count
FROM companies
UNION ALL
SELECT 
  'employees' as table_name,
  COUNT(*) as record_count
FROM employees
UNION ALL
SELECT 
  'attendance_records' as table_name,
  COUNT(*) as record_count
FROM attendance_records
UNION ALL
SELECT 
  'payroll_records' as table_name,
  COUNT(*) as record_count
FROM payroll_records; 