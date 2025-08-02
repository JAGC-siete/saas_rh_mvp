-- Verificar estructura de attendance_records
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'attendance_records' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar si hay datos de asistencia
SELECT 
  'Datos de asistencia' as test,
  COUNT(*) as total_records
FROM attendance_records;

-- Verificar estructura de employees para comparar
SELECT 
  'Estructura employees' as test,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND table_schema = 'public'
AND column_name IN ('id', 'name', 'employee_code', 'department_id', 'company_id')
ORDER BY ordinal_position; 