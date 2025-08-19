-- ARREGLAR API DE LOGIN - USAR COLUMNAS CORRECTAS
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar columnas reales de employees
SELECT 
    'COLUMNAS REALES EN EMPLOYEES:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'employees'
AND column_name IN ('name', 'role', 'team', 'position', 'dni', 'email')
ORDER BY column_name;

-- 2. Verificar datos de Gustavo con columnas correctas
SELECT 
    'GUSTAVO CON COLUMNAS CORRECTAS:' as info,
    name,
    role,
    team,
    dni,
    email,
    company_id,
    status
FROM employees 
WHERE dni = '0801198522949';

-- 3. Estado final
SELECT '✅ VERIFICACIÓN COMPLETADA - API NECESITA SER ARREGLADA' as status;
