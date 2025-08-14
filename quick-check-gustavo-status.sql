-- VERIFICAR ESTADO ACTUAL DE GUSTAVO (1 MINUTO)
-- Ejecutar en Supabase SQL Editor

SELECT 
    'GUSTAVO STATUS:' as info,
    id,
    role,
    company_id,
    is_active,
    permissions
FROM user_profiles 
WHERE id = '0d875a24-a774-41b6-b221-791989491ce7';
