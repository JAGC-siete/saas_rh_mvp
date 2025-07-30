-- 🔧 ARREGLAR PERMISOS DE JORGE EN SUPABASE
-- User ID: 325a749e-7818-4d24-b29f-2c859e332aa1
-- Email: jorge@miempresa.com

-- 1. Verificar si hay empresas
SELECT 'Verificando empresas...' as status;
SELECT * FROM companies LIMIT 1;

-- 2. Crear empresa por defecto si no existe
INSERT INTO companies (id, name, subdomain, plan_type, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Mi Empresa',
  'miempresa',
  'basic',
  '{}'
) ON CONFLICT (id) DO NOTHING;

-- 3. Crear perfil de usuario para Jorge con permisos de admin
INSERT INTO user_profiles (id, company_id, role, permissions, is_active)
VALUES (
  '325a749e-7818-4d24-b29f-2c859e332aa1', -- User ID de Jorge
  '00000000-0000-0000-0000-000000000001', -- ID de la empresa
  'company_admin',
  '{"can_manage_employees": true, "can_view_payroll": true, "can_manage_attendance": true, "can_manage_departments": true, "can_approve_leave": true}',
  true
) ON CONFLICT (id) DO UPDATE SET
  role = 'company_admin',
  permissions = '{"can_manage_employees": true, "can_view_payroll": true, "can_manage_attendance": true, "can_manage_departments": true, "can_approve_leave": true}',
  is_active = true;

-- 4. Verificar que se creó correctamente
SELECT 'Verificando perfil creado...' as status;
SELECT 
  id,
  company_id,
  role,
  permissions,
  is_active,
  created_at
FROM user_profiles 
WHERE id = '325a749e-7818-4d24-b29f-2c859e332aa1';

-- 5. Verificar permisos de payroll
SELECT 'Verificando permisos de payroll...' as status;
SELECT 
  up.id,
  up.role,
  up.permissions,
  c.name as company_name
FROM user_profiles up
JOIN companies c ON c.id = up.company_id
WHERE up.id = '325a749e-7818-4d24-b29f-2c859e332aa1'; 