-- CREAR PERFIL ADMIN PARA GUSTAVO
-- Usuario ya existe: gustavo.gnaz@gmail.com
-- User ID: 0d875a24-a774-41b6-b221-791989491ce7

-- 1. Crear empresa si no existe
INSERT INTO companies (
    name,
    subdomain,
    plan_type,
    settings,
    is_active
) VALUES (
    'Paragon Honduras',
    'paragon-honduras',
    'premium',
    '{"timezone": "America/Tegucigalpa", "country": "Honduras"}'::jsonb,
    true
)
ON CONFLICT (subdomain) DO NOTHING;

-- 2. Crear perfil de usuario admin
INSERT INTO user_profiles (
    id,
    company_id,
    role,
    permissions,
    is_active,
    created_at,
    updated_at
) VALUES (
    '0d875a24-a774-41b6-b221-791989491ce7', -- ID de Gustavo
    (SELECT id FROM companies WHERE subdomain = 'paragon-honduras'),
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
    company_id = (SELECT id FROM companies WHERE subdomain = 'paragon-honduras'),
    updated_at = NOW();

-- 3. Verificar que se creó correctamente
SELECT 
    '✅ PERFIL ADMIN CREADO' as status,
    up.id,
    up.role,
    up.permissions,
    up.is_active,
    c.name as company_name,
    c.subdomain
FROM user_profiles up
LEFT JOIN companies c ON up.company_id = c.id
WHERE up.id = '0d875a24-a774-41b6-b221-791989491ce7';
