-- DEBUG: Verificar registros del empleado 15164
-- Ejecutar en Supabase SQL Editor

-- 1. Buscar el empleado por DNI
SELECT 
  id,
  dni,
  name,
  status,
  work_schedule_id,
  company_id
FROM employees 
WHERE dni ILIKE '%15164%' 
  AND status = 'active';

-- 2. Verificar registros de asistencia para hoy (7 de agosto)
SELECT 
  ar.id,
  ar.employee_id,
  ar.date,
  ar.check_in,
  ar.check_out,
  ar.late_minutes,
  ar.justification,
  ar.created_at,
  e.dni,
  e.name
FROM attendance_records ar
JOIN employees e ON ar.employee_id = e.id
WHERE e.dni ILIKE '%15164%'
  AND ar.date = '2025-08-07'
ORDER BY ar.created_at DESC;

-- 3. Verificar todos los registros del empleado 15164
SELECT 
  ar.id,
  ar.employee_id,
  ar.date,
  ar.check_in,
  ar.check_out,
  ar.late_minutes,
  ar.justification,
  ar.created_at,
  e.dni,
  e.name
FROM attendance_records ar
JOIN employees e ON ar.employee_id = e.id
WHERE e.dni ILIKE '%15164%'
ORDER BY ar.date DESC, ar.created_at DESC
LIMIT 10;

-- 4. Verificar la fecha actual en Honduras
SELECT 
  NOW() as utc_now,
  NOW() AT TIME ZONE 'America/Tegucigalpa' as honduras_now,
  DATE(NOW() AT TIME ZONE 'America/Tegucigalpa') as honduras_today; 