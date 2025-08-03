-- SCRIPT FINAL PARA VERIFICAR PERMISOS DE PAYROLL
-- Ejecutar en Supabase SQL Editor

-- ========================================
-- PASO 1: OBTENER ID DEL USUARIO JORGE
-- ========================================
SELECT 
  'ID DE USUARIO' as test,
  id,
  email,
  created_at
FROM auth.users 
WHERE email = 'jorge7gomez@gmail.com';

-- ========================================
-- PASO 2: VERIFICAR PERFIL ACTUALIZADO
-- ========================================
WITH user_id AS (
  SELECT id FROM auth.users WHERE email = 'jorge7gomez@gmail.com'
)
SELECT 
  'PERFIL ACTUALIZADO' as test,
  up.id,
  up.role,
  up.is_active,
  up.permissions->>'payroll:create' as payroll_create,
  up.permissions->>'payroll:read' as payroll_read,
  up.permissions->>'employees:read' as employees_read
FROM user_profiles up
WHERE up.id IN (SELECT id FROM user_id);

-- ========================================
-- PASO 3: PROBAR INSERCIÓN DE PAYROLL
-- ========================================
WITH user_id AS (
  SELECT id FROM auth.users WHERE email = 'jorge7gomez@gmail.com'
)
INSERT INTO payroll_records (
  employee_id,
  period_start,
  period_end,
  period_type,
  base_salary,
  overtime_hours,
  overtime_amount,
  bonuses,
  commissions,
  other_earnings,
  gross_salary,
  income_tax,
  social_security,
  professional_tax,
  other_deductions,
  total_deductions,
  net_salary,
  days_worked,
  days_absent,
  late_days,
  status,
  notes,
  metadata
) VALUES (
  '33333333-3333-3333-3333-333333333331',
  '2024-07-01',
  '2024-07-15',
  'biweekly',
  35000,
  0,
  0,
  0,
  0,
  0,
  35000,
  2000,
  1500,
  500,
  0,
  4000,
  31000,
  15,
  0,
  0,
  'pending',
  'Prueba de permisos - ' || NOW(),
  '{}'
) RETURNING 
  'INSERCIÓN EXITOSA' as test,
  id,
  employee_id,
  period_start,
  period_end,
  gross_salary,
  net_salary;

-- ========================================
-- PASO 4: VERIFICAR QUE SE INSERTÓ
-- ========================================
SELECT 
  'VERIFICACIÓN INSERCIÓN' as test,
  COUNT(*) as total_records,
  MAX(created_at) as ultimo_registro
FROM payroll_records 
WHERE notes LIKE 'Prueba de permisos%';

-- ========================================
-- PASO 5: LIMPIAR REGISTRO DE PRUEBA
-- ========================================
DELETE FROM payroll_records 
WHERE notes LIKE 'Prueba de permisos%'
RETURNING 
  'REGISTRO ELIMINADO' as test,
  id,
  notes;

-- ========================================
-- PASO 6: VERIFICAR POLICIES RLS
-- ========================================
SELECT 
  'POLICIES RLS' as test,
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename IN ('payroll_records', 'employees', 'attendance_records')
AND policyname LIKE '%Super admins%'
ORDER BY tablename, policyname;

-- ========================================
-- PASO 7: VERIFICAR RLS STATUS
-- ========================================
SELECT 
  'RLS STATUS' as test,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('payroll_records', 'employees', 'attendance_records', 'user_profiles')
AND schemaname = 'public'
ORDER BY tablename;

-- ========================================
-- PASO 8: RESUMEN FINAL
-- ========================================
WITH user_info AS (
  SELECT id FROM auth.users WHERE email = 'jorge7gomez@gmail.com'
),
profile_info AS (
  SELECT role, is_active, permissions
  FROM user_profiles 
  WHERE id IN (SELECT id FROM user_info)
)
SELECT 
  'RESUMEN FINAL' as test,
  'Usuario encontrado' as status,
  (SELECT COUNT(*) FROM user_info) as user_count
UNION ALL
SELECT 
  'RESUMEN FINAL' as test,
  'Perfil encontrado' as status,
  (SELECT COUNT(*) FROM profile_info) as profile_count
UNION ALL
SELECT 
  'RESUMEN FINAL' as test,
  'Role' as status,
  (SELECT role FROM profile_info LIMIT 1) as role_value
UNION ALL
SELECT 
  'RESUMEN FINAL' as test,
  'Activo' as status,
  (SELECT is_active::text FROM profile_info LIMIT 1) as active_value
UNION ALL
SELECT 
  'RESUMEN FINAL' as test,
  'Permisos payroll:create' as status,
  (SELECT permissions->>'payroll:create' FROM profile_info LIMIT 1) as permission_value; 