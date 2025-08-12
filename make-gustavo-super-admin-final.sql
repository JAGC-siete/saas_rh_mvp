-- 🚀 HACER GUSTAVO SUPER_ADMIN COMO JORGE
-- Este script hace que Gustavo tenga exactamente los mismos permisos que Jorge

-- 1. Verificar estado actual de Gustavo
SELECT 
  id,
  email,
  role,
  company_id,
  can_access_settings,
  can_manage_employees,
  can_manage_payroll,
  can_manage_attendance,
  can_manage_reports,
  can_manage_departments,
  can_manage_leave,
  can_manage_work_schedules,
  created_at,
  updated_at
FROM user_profiles 
WHERE email = 'gustavo.gnaz@gmail.com';

-- 2. Hacer Gustavo super_admin con company_id null
UPDATE user_profiles 
SET 
  role = 'super_admin',
  company_id = NULL,
  can_access_settings = false,
  can_manage_employees = true,
  can_manage_payroll = true,
  can_manage_attendance = true,
  can_manage_reports = true,
  can_manage_departments = true,
  can_manage_leave = true,
  can_manage_work_schedules = true,
  updated_at = NOW()
WHERE email = 'gustavo.gnaz@gmail.com';

-- 3. Verificar el cambio
SELECT 
  id,
  email,
  role,
  company_id,
  can_access_settings,
  can_manage_employees,
  can_manage_payroll,
  can_manage_attendance,
  can_manage_reports,
  can_manage_departments,
  can_manage_leave,
  can_manage_work_schedules,
  created_at,
  updated_at
FROM user_profiles 
WHERE email = 'gustavo.gnaz@gmail.com';

-- 4. Verificar que ahora es igual a Jorge
SELECT 
  'GUSTAVO' as user_type,
  email,
  role,
  company_id,
  can_access_settings
FROM user_profiles 
WHERE email = 'gustavo.gnaz@gmail.com'

UNION ALL

SELECT 
  'JORGE' as user_type,
  email,
  role,
  company_id,
  can_access_settings
FROM user_profiles 
WHERE email = 'jorge7gomez@gmail.com';
