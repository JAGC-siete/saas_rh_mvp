-- VERIFICAR DATOS REALES DE GUSTAVO EN EMPLOYEES
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar si Gustavo existe en employees
SELECT 
    'GUSTAVO EN EMPLOYEES:' as info,
    id,
    name,
    email,
    dni,
    role,
    position,
    company_id,
    status
FROM employees 
WHERE email = 'gustavo.gnaz@gmail.com'
OR dni = 'gustavo.gnaz@gmail.com'
OR name ILIKE '%gustavo%';

-- 2. Verificar estructura de la tabla employees
SELECT 
    'ESTRUCTURA EMPLOYEES:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'employees'
ORDER BY ordinal_position;

-- 3. Verificar si hay RLS en employees que pueda estar causando problemas
SELECT 
    'RLS EN EMPLOYEES:' as info,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'employees';

-- 4. Verificar políticas RLS en employees
SELECT 
    'POLÍTICAS RLS EN EMPLOYEES:' as info,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'employees'
ORDER BY policyname;

-- 5. Estado final
SELECT '✅ VERIFICACIÓN COMPLETADA - BUSCANDO EL PROBLEMA REAL' as status;
