-- Script para crear datos de prueba (VERSIÓN CORREGIDA)
-- Ejecutar en Supabase SQL Editor

-- 1. Crear empleados de prueba (sin la columna position)
INSERT INTO employees (
  id,
  name,
  employee_code,
  dni,
  email,
  phone,
  department_id,
  base_salary,
  bank_name,
  bank_account,
  status,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  'Juan Pérez',
  'EMP001',
  '0801-1990-12345',
  'juan.perez@paragon.com',
  '+504-9999-0001',
  'TEC',
  45000.00,
  'BAC Credomatic',
  '1234567890',
  'active',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'María González',
  'EMP002',
  '0801-1985-54321',
  'maria.gonzalez@paragon.com',
  '+504-9999-0002',
  'RH',
  38000.00,
  'Ficohsa',
  '0987654321',
  'active',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Carlos Rodríguez',
  'EMP003',
  '0801-1992-67890',
  'carlos.rodriguez@paragon.com',
  '+504-9999-0003',
  'FIN',
  42000.00,
  'Banco Atlántida',
  '1122334455',
  'active',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Ana Martínez',
  'EMP004',
  '0801-1988-13579',
  'ana.martinez@paragon.com',
  '+504-9999-0004',
  'TEC',
  40000.00,
  'BAC Credomatic',
  '5566778899',
  'active',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Luis Hernández',
  'EMP005',
  '0801-1995-24680',
  'luis.hernandez@paragon.com',
  '+504-9999-0005',
  'VEN',
  35000.00,
  'Ficohsa',
  '9988776655',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (employee_code) DO NOTHING;

-- 2. Crear registros de asistencia de prueba
INSERT INTO attendance_records (
  id,
  employee_id,
  check_in,
  check_out,
  date,
  status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  e.id,
  (CURRENT_DATE - INTERVAL '1 day')::date + '08:00:00'::time,
  (CURRENT_DATE - INTERVAL '1 day')::date + '17:00:00'::time,
  (CURRENT_DATE - INTERVAL '1 day')::date,
  'present',
  NOW(),
  NOW()
FROM employees e
WHERE e.status = 'active'
LIMIT 3;

-- 3. Crear registros de asistencia para hoy
INSERT INTO attendance_records (
  id,
  employee_id,
  check_in,
  check_out,
  date,
  status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  e.id,
  CURRENT_DATE + '08:00:00'::time,
  NULL,
  CURRENT_DATE,
  'present',
  NOW(),
  NOW()
FROM employees e
WHERE e.status = 'active'
LIMIT 2;

-- 4. Verificar datos creados
SELECT 
  'Empleados creados' as info,
  COUNT(*) as count
FROM employees
WHERE status = 'active';

SELECT 
  'Registros de asistencia creados' as info,
  COUNT(*) as count
FROM attendance_records
WHERE date >= CURRENT_DATE - INTERVAL '1 day';

-- 5. Mostrar empleados creados
SELECT 
  'Empleados activos' as info,
  name,
  employee_code,
  department_id,
  base_salary,
  status
FROM employees
WHERE status = 'active'
ORDER BY name;

-- 6. Mostrar asistencia reciente
SELECT 
  'Asistencia reciente' as info,
  ar.date,
  e.name,
  ar.check_in,
  ar.check_out,
  ar.status
FROM attendance_records ar
JOIN employees e ON ar.employee_id = e.id
WHERE ar.date >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY ar.date DESC, e.name; 