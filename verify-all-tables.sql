-- VERIFICACIÓN COMPLETA DE ESTRUCTURA DE TABLAS
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar todas las tablas del esquema público
SELECT 
  'Todas las tablas' as test,
  tablename,
  schemaname
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Verificar estructura de user_profiles
SELECT 
  'user_profiles estructura' as test,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar estructura de employees
SELECT 
  'employees estructura' as test,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Verificar estructura de attendance_records
SELECT 
  'attendance_records estructura' as test,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'attendance_records' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Verificar estructura de payroll_records
SELECT 
  'payroll_records estructura' as test,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'payroll_records' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Verificar estructura de companies (si existe)
SELECT 
  'companies estructura' as test,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. Verificar claves foráneas
SELECT 
  'Claves foráneas' as test,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 8. Verificar índices
SELECT 
  'Índices' as test,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'employees', 'attendance_records', 'payroll_records', 'companies')
ORDER BY tablename, indexname;

-- 9. Verificar RLS (Row Level Security)
SELECT 
  'Estado RLS' as test,
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN 'Habilitado'
    ELSE 'Deshabilitado'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'employees', 'attendance_records', 'payroll_records', 'companies')
ORDER BY tablename;

-- 10. Verificar políticas RLS
SELECT 
  'Políticas RLS' as test,
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
AND tablename IN ('user_profiles', 'employees', 'attendance_records', 'payroll_records', 'companies')
ORDER BY tablename, policyname;

-- 11. Verificar datos de muestra
SELECT 
  'Datos user_profiles' as test,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN role = 'super_admin' THEN 1 END) as super_admins,
  COUNT(CASE WHEN company_id IS NOT NULL THEN 1 END) as with_company
FROM user_profiles;

SELECT 
  'Datos employees' as test,
  COUNT(*) as total_employees,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_employees,
  COUNT(CASE WHEN company_id IS NOT NULL THEN 1 END) as with_company
FROM employees;

SELECT 
  'Datos attendance_records' as test,
  COUNT(*) as total_records,
  COUNT(DISTINCT employee_id) as unique_employees,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM attendance_records;

SELECT 
  'Datos payroll_records' as test,
  COUNT(*) as total_records,
  COUNT(DISTINCT employee_id) as unique_employees,
  MIN(period_start) as earliest_period,
  MAX(period_start) as latest_period
FROM payroll_records;

-- 12. Verificar conflictos potenciales
SELECT 
  'CONFLICTOS POTENCIALES' as test,
  'employees.company_id' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'employees' AND column_name = 'company_id'
    ) THEN 'EXISTE'
    ELSE 'NO EXISTE - CONFLICTO'
  END as status
UNION ALL
SELECT 
  'attendance_records.company_id' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'attendance_records' AND column_name = 'company_id'
    ) THEN 'EXISTE'
    ELSE 'NO EXISTE - CONFLICTO'
  END as status
UNION ALL
SELECT 
  'employees.department' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'employees' AND column_name = 'department'
    ) THEN 'EXISTE - CONFLICTO (debería ser department_id)'
    ELSE 'NO EXISTE - CORRECTO'
  END as status; 