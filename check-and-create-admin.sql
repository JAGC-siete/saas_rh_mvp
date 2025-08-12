-- SCRIPT SEGURO: Primero verificar, luego crear
-- Ejecutar en Supabase SQL Editor

-- PASO 1: Verificar qué empresas existen
SELECT '=== EMPRESAS EXISTENTES ===' as info;
SELECT 
    id,
    name,
    subdomain,
    plan_type,
    is_active,
    created_at
FROM companies
ORDER BY created_at DESC;

-- PASO 2: Verificar qué usuarios existen
SELECT '=== USUARIOS EXISTENTES ===' as info;
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- PASO 3: Verificar perfiles de usuario existentes
SELECT '=== PERFILES DE USUARIO EXISTENTES ===' as info;
SELECT 
    up.id,
    up.role,
    up.company_id,
    up.is_active,
    c.name as company_name
FROM user_profiles up
LEFT JOIN companies c ON up.company_id = c.id
ORDER BY up.created_at DESC;

-- PASO 4: Crear empresa solo si no existe ninguna
DO $$
DECLARE
    company_count INTEGER;
    new_company_id UUID;
BEGIN
    -- Contar empresas existentes
    SELECT COUNT(*) INTO company_count FROM companies;
    
    IF company_count = 0 THEN
        -- No hay empresas, crear una por defecto
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
        ) RETURNING id INTO new_company_id;
        
        RAISE NOTICE 'Empresa creada con ID: %', new_company_id;
    ELSE
        RAISE NOTICE 'Ya existen % empresas. Usar la primera disponible.', company_count;
    END IF;
END $$;

-- PASO 5: Mostrar empresa a usar
SELECT '=== EMPRESA A USAR ===' as info;
SELECT 
    id,
    name,
    subdomain,
    plan_type
FROM companies
ORDER BY created_at ASC
LIMIT 1;

-- PASO 6: INSTRUCCIONES PARA CREAR USUARIO ADMIN
SELECT '=== INSTRUCCIONES ===' as info;
SELECT 
    '1. Crear usuario en Supabase Auth: gustavo.gnaz@gmail.com / eljefe123456' as paso1,
    '2. Copiar el User ID del usuario creado' as paso2,
    '3. Ejecutar el siguiente comando reemplazando USER_ID_AQUI:' as paso3;

-- PASO 7: COMANDO PARA CREAR ADMIN (ejecutar después de crear el usuario)
-- REEMPLAZAR 'USER_ID_AQUI' con el ID real del usuario
/*
INSERT INTO user_profiles (
    id,
    company_id,
    role,
    permissions,
    is_active
) VALUES (
    'USER_ID_AQUI', -- ⚠️ REEMPLAZAR con el ID real
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
*/
