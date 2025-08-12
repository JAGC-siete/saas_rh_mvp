-- COPIAR PERMISOS EXACTOS DE JORGE A GUSTAVO
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Copiar permisos EXACTOS de Jorge a Gustavo
UPDATE user_profiles 
SET 
    permissions = '{
        "can_view_payroll": true,
        "can_view_reports": true,
        "can_export_payroll": true,
        "can_generate_payroll": true,
        "can_manage_companies": true,
        "can_manage_employees": true,
        "can_manage_attendance": true,
        "can_manage_departments": true,
        "can_register_attendance": true,
        "can_view_own_attendance": true
    }'::jsonb,
    updated_at = NOW()
WHERE id = '0d875a24-a774-41b6-b221-791989491ce7';

-- 2. Verificar que ahora son IDÉNTICOS
SELECT 
    'JORGE' as user_type,
    role,
    company_id,
    is_active,
    permissions
FROM user_profiles 
WHERE id = '8c49be71-c48f-4fee-9935-44a168eb2dfe'

UNION ALL

SELECT 
    'GUSTAVO' as user_type,
    role,
    company_id,
    is_active,
    permissions
FROM user_profiles 
WHERE id = '0d875a24-a774-41b6-b221-791989491ce7';

-- 3. Verificar que los permisos son idénticos
SELECT 
    CASE 
        WHEN j.permissions = g.permissions THEN '✅ PERMISOS IDÉNTICOS'
        ELSE '❌ PERMISOS DIFERENTES'
    END as status,
    j.permissions as jorge_permissions,
    g.permissions as gustavo_permissions
FROM user_profiles j, user_profiles g
WHERE j.id = '8c49be71-c48f-4fee-9935-44a168eb2dfe'
AND g.id = '0d875a24-a774-41b6-b221-791989491ce7';

-- 4. Estado final
SELECT '✅ GUSTAVO AHORA TIENE PERMISOS IDÉNTICOS A JORGE' as status;
