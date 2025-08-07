-- ANÁLISIS DE DUPLICADOS EN ATTENDANCE_RECORDS
-- Ejecutar para identificar problemas antes de la limpieza

-- 1. Identificar empleados con múltiples registros por día (4-7 agosto)
SELECT 
  ar.employee_id,
  e.name as employee_name,
  ar.date,
  COUNT(*) as total_registros,
  MIN(ar.check_in) as primera_entrada,
  MAX(ar.check_in) as ultima_entrada,
  MAX(ar.check_out) as ultima_salida,
  STRING_AGG(ar.id::text, ', ' ORDER BY ar.check_in) as registro_ids
FROM attendance_records ar
JOIN employees e ON ar.employee_id = e.id
WHERE ar.date BETWEEN '2025-08-04' AND '2025-08-07'
GROUP BY ar.employee_id, e.name, ar.date
HAVING COUNT(*) > 1
ORDER BY ar.date, e.name;

-- 2. Resumen de duplicados por día
SELECT 
  date,
  COUNT(DISTINCT employee_id) as empleados_con_duplicados,
  SUM(total_registros) as total_registros_duplicados
FROM (
  SELECT 
    ar.employee_id,
    ar.date,
    COUNT(*) as total_registros
  FROM attendance_records ar
  WHERE ar.date BETWEEN '2025-08-04' AND '2025-08-07'
  GROUP BY ar.employee_id, ar.date
  HAVING COUNT(*) > 1
) duplicates
GROUP BY date
ORDER BY date;

-- 3. Verificar work_schedules con timezone incorrecto
SELECT 
  id,
  name,
  timezone,
  monday_start,
  monday_end
FROM work_schedules 
WHERE timezone != 'America/Tegucigalpa'
ORDER BY name;

-- 4. Empleados sin registros del 4-7 agosto (para payroll)
SELECT 
  e.id,
  e.name,
  e.dni,
  e.status
FROM employees e
WHERE e.status = 'active'
AND NOT EXISTS (
  SELECT 1 FROM attendance_records ar 
  WHERE ar.employee_id = e.id 
  AND ar.date BETWEEN '2025-08-04' AND '2025-08-07'
)
ORDER BY e.name; 