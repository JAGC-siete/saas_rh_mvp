-- ACTUALIZAR PERMISOS DEL USUARIO jefe@paragon.com
-- UUID: 673e3f25-7b52-4861-b806-a83aba950da3

-- 1. Verificar si ya existe en user_profiles
SELECT '=== VERIFICAR USUARIO EXISTENTE ===' as info;
SELECT * FROM user_profiles WHERE id = '673e3f25-7b52-4861-b806-a83aba950da3';

-- 2. Crear o actualizar perfil con permisos restringidos
INSERT INTO user_profiles (
    id,
    company_id,
    role,
    permissions,
    is_active,
    created_at,
    updated_at
) VALUES (
    '673e3f25-7b52-4861-b806-a83aba950da3',
    (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1),
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
    company_id = (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1),
    updated_at = NOW();

-- 3. Verificar que se aplicó correctamente
SELECT '=== PERMISOS APLICADOS ===' as info;
SELECT 
    id,
    role,
    permissions,
    is_active,
    company_id
FROM user_profiles 
WHERE id = '673e3f25-7b52-4861-b806-a83aba950da3';
