-- Test rápido para verificar que todo funciona
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar que el perfil de jorge existe
SELECT 
  'Perfil de jorge' as test,
  id,
  role,
  is_active,
  company_id
FROM user_profiles 
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'jorge7gomez@gmail.com'
);

-- 2. Verificar estructura de employees
SELECT 
  'Estructura employees' as test,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND table_schema = 'public'
AND column_name IN ('id', 'name', 'employee_code', 'department_id', 'base_salary', 'status')
ORDER BY ordinal_position;

-- 3. Crear un empleado de prueba rápido
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
  'Test Employee',
  'TEST001',
  '0801-1990-99999',
  'test@paragon.com',
  '+504-9999-9999',
  'TEC',
  40000.00,
  'BAC Credomatic',
  '9999999999',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (employee_code) DO NOTHING;

-- 4. Verificar que el empleado se creó
SELECT 
  'Empleado creado' as test,
  name,
  employee_code,
  department_id,
  base_salary,
  status
FROM employees
WHERE employee_code = 'TEST001';

-- 5. Contar empleados totales
SELECT 
  'Total empleados' as test,
  COUNT(*) as count
FROM employees
WHERE status = 'active';

-- 6. Verificar RLS
SELECT 
  'Estado RLS' as test,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'employees', 'payroll_records')
AND schemaname = 'public'; 