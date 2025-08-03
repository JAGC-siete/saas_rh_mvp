-- SCRIPT PARA PROBAR CON DATOS DE JULIO 2024
-- Los datos reales están en julio y agosto 2024

-- Verificar datos de asistencia para julio 2024
SELECT 
  'ASISTENCIA JULIO 2024' as test,
  COUNT(*) as total_records
FROM attendance_records 
WHERE date BETWEEN '2024-07-01' AND '2024-07-31';

-- Verificar datos de asistencia para julio 2024 (primera quincena)
SELECT 
  'ASISTENCIA JULIO 2024 (1-15)' as test,
  COUNT(*) as total_records
FROM attendance_records 
WHERE date BETWEEN '2024-07-01' AND '2024-07-15'
AND check_in IS NOT NULL 
AND check_out IS NOT NULL;

-- Mostrar algunos registros de ejemplo
SELECT 
  'EJEMPLO REGISTROS JULIO' as test,
  ar.id,
  ar.employee_id,
  e.name,
  ar.date,
  ar.check_in,
  ar.check_out,
  ar.status
FROM attendance_records ar
JOIN employees e ON ar.employee_id = e.id
WHERE ar.date BETWEEN '2024-07-01' AND '2024-07-15'
AND ar.check_in IS NOT NULL 
AND ar.check_out IS NOT NULL
LIMIT 5;

-- Verificar empleados activos con asistencia en julio
SELECT 
  'EMPLEADOS CON ASISTENCIA JULIO' as test,
  COUNT(DISTINCT ar.employee_id) as empleados_con_asistencia
FROM attendance_records ar
JOIN employees e ON ar.employee_id = e.id
WHERE ar.date BETWEEN '2024-07-01' AND '2024-07-15'
AND ar.check_in IS NOT NULL 
AND ar.check_out IS NOT NULL
AND e.status = 'active'; 