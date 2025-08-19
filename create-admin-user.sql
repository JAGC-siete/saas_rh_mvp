-- Script para crear usuario admin con acceso completo
-- Ejecutar en Supabase SQL Editor

-- 1. Crear el usuario en auth.users (esto se hace automáticamente al hacer signup)
-- Primero necesitas crear el usuario manualmente en Supabase Auth con:
-- Email: gustavo.gnaz@gmail.com
-- Password: eljefe123456

-- 2. Obtener el ID del usuario creado (reemplaza con el ID real)
-- Puedes obtenerlo de: Supabase Dashboard > Authentication > Users

-- 3. Crear/actualizar el perfil de usuario con rol de admin
INSERT INTO user_profiles (
    id,
    company_id,
    employee_id,
    role,
    permissions,
    is_active,
    created_at,
    updated_at
) VALUES (
    'REEMPLAZAR_CON_USER_ID_REAL', -- Reemplazar con el ID del usuario de auth.users
    (SELECT id FROM companies LIMIT 1), -- Asignar a la primera empresa disponible
    NULL, -- No es empleado específico
    'company_admin', -- Rol de administrador de empresa
    '{
        "dashboard": true,
        "employees": true,
        "departments": true,
        "attendance": true,
        "leave": true,
        "payroll": true,
        "reports": true,
        "gamification": true,
        "settings": false
    }'::jsonb, -- Permisos específicos
    true,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    role = 'company_admin',
    permissions = '{
        "dashboard": true,
        "employees": true,
        "departments": true,
        "attendance": true,
        "leave": true,
        "payroll": true,
        "reports": true,
        "gamification": true,
        "settings": false
    }'::jsonb,
    updated_at = NOW();

-- 4. Verificar que se creó correctamente
SELECT 
    up.id,
    up.role,
    up.permissions,
    up.is_active,
    up.created_at
FROM user_profiles up
WHERE up.id = 'REEMPLAZAR_CON_USER_ID_REAL';

-- 5. Si no hay empresas, crear una empresa por defecto
INSERT INTO companies (
    name,
    subdomain,
    plan_type,
    settings,
    is_active
) VALUES (
    'Paragon Honduras',
    'paragon',
    'premium',
    '{"timezone": "America/Tegucigalpa", "country": "Honduras"}'::jsonb,
    true
)
ON CONFLICT (subdomain) DO NOTHING;

-- 6. Actualizar el user_profile con la empresa creada
UPDATE user_profiles 
SET company_id = (SELECT id FROM companies WHERE subdomain = 'paragon')
WHERE id = 'REEMPLAZAR_CON_USER_ID_REAL';

-- 7. Verificar el resultado final
SELECT 
    up.id,
    up.role,
    up.permissions,
    up.is_active,
    c.name as company_name,
    up.created_at
FROM user_profiles up
LEFT JOIN companies c ON up.company_id = c.id
WHERE up.id = 'REEMPLAZAR_CON_USER_ID_REAL';
