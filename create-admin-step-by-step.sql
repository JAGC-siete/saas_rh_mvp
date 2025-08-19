-- SCRIPT PASO A PASO PARA CREAR USUARIO ADMIN
-- Ejecutar en Supabase SQL Editor

-- PASO 1: Crear empresa si no existe
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

-- PASO 2: Obtener el ID de la empresa
SELECT id, name, subdomain FROM companies WHERE subdomain = 'paragon';

-- PASO 3: Crear el perfil de usuario admin (REEMPLAZAR 'USER_ID_AQUI' con el ID real)
-- Primero crea el usuario en Supabase Auth con:
-- Email: gustavo.gnaz@gmail.com
-- Password: eljefe123456
-- Luego copia el ID del usuario y reemplázalo abajo

INSERT INTO user_profiles (
    id,
    company_id,
    role,
    permissions,
    is_active
) VALUES (
    'USER_ID_AQUI', -- ⚠️ REEMPLAZAR con el ID real del usuario
    (SELECT id FROM companies WHERE subdomain = 'paragon'),
    'company_admin',
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
    }'::jsonb,
    true
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

-- PASO 4: Verificar que se creó correctamente
SELECT 
    up.id,
    up.role,
    up.permissions,
    up.is_active,
    c.name as company_name
FROM user_profiles up
LEFT JOIN companies c ON up.company_id = c.id
WHERE up.id = 'USER_ID_AQUI'; -- ⚠️ REEMPLAZAR con el ID real
