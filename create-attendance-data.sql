-- Crear datos de asistencia de prueba para enero 2025
-- Primero obtener el employee_id del empleado TEST001

-- Insertar registros de asistencia para la primera quincena de enero 2025
INSERT INTO attendance_records (
  id,
  employee_id,
  date,
  check_in,
  check_out,
  status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  e.id,
  date_series.date,
  date_series.date + '08:00:00'::time,
  date_series.date + '17:00:00'::time,
  'present',
  NOW(),
  NOW()
FROM employees e
CROSS JOIN (
  SELECT generate_series(
    '2025-01-01'::date,
    '2025-01-15'::date,
    '1 day'::interval
  )::date as date
) date_series
WHERE e.employee_code = 'TEST001'
AND EXTRACT(DOW FROM date_series.date) NOT IN (0, 6) -- Excluir sábados y domingos
ON CONFLICT (employee_id, date) DO NOTHING;

-- Verificar que se crearon los registros
SELECT 
  'Registros de asistencia creados' as test,
  COUNT(*) as total_records
FROM attendance_records ar
JOIN employees e ON ar.employee_id = e.id
WHERE e.employee_code = 'TEST001'
AND ar.date BETWEEN '2025-01-01' AND '2025-01-15';

-- Mostrar algunos registros de ejemplo
SELECT 
  'Ejemplo de registros' as test,
  e.name,
  ar.date,
  ar.check_in,
  ar.check_out,
  ar.status
FROM attendance_records ar
JOIN employees e ON ar.employee_id = e.id
WHERE e.employee_code = 'TEST001'
AND ar.date BETWEEN '2025-01-01' AND '2025-01-15'
ORDER BY ar.date
LIMIT 5; 