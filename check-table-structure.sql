-- Verificar estructura de tablas
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar estructura de employees
SELECT 
  'Estructura de employees' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar estructura de user_profiles
SELECT 
  'Estructura de user_profiles' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar estructura de attendance_records
SELECT 
  'Estructura de attendance_records' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'attendance_records' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Verificar estructura de payroll_records
SELECT 
  'Estructura de payroll_records' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'payroll_records' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Contar registros en cada tabla
SELECT 
  'Conteo de registros' as info,
  'employees' as table_name,
  COUNT(*) as count
FROM employees
UNION ALL
SELECT 
  'Conteo de registros' as info,
  'user_profiles' as table_name,
  COUNT(*) as count
FROM user_profiles
UNION ALL
SELECT 
  'Conteo de registros' as info,
  'attendance_records' as table_name,
  COUNT(*) as count
FROM attendance_records
UNION ALL
SELECT 
  'Conteo de registros' as info,
  'payroll_records' as table_name,
  COUNT(*) as count
FROM payroll_records; 