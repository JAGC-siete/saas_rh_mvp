-- VERIFICAR SI SUPER_ADMIN TIENE BYPASS RLS
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Verificar si hay políticas RLS que excluyan a super_admin
SELECT 
    'POLÍTICAS QUE EXCLUYEN SUPER_ADMIN:' as info,
    tablename,
    policyname,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND (
    qual::text LIKE '%super_admin%' 
    OR qual::text LIKE '%role%'
    OR with_check::text LIKE '%super_admin%'
    OR with_check::text LIKE '%role%'
)
ORDER BY tablename, policyname;

-- 2. Verificar si hay políticas que usen auth.uid() pero excluyan super_admin
SELECT 
    'POLÍTICAS CON AUTH.UID PERO POSIBLE BYPASS:' as info,
    tablename,
    policyname,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND (
    qual::text LIKE '%auth.uid%' 
    OR with_check::text LIKE '%auth.uid%'
)
ORDER BY tablename, policyname;

-- 3. Verificar si hay funciones que manejen roles
SELECT 
    'FUNCIONES QUE MANEJAN ROLES:' as info,
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_definition LIKE '%super_admin%'
ORDER BY routine_name;

-- 4. Verificar si hay triggers que verifiquen roles
SELECT 
    'TRIGGERS QUE VERIFICAN ROLES:' as info,
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND action_statement LIKE '%super_admin%'
ORDER BY event_object_table, trigger_name;

-- 5. Verificar si hay políticas que usen user_profiles.role
SELECT 
    'POLÍTICAS QUE USAN USER_PROFILES.ROLE:' as info,
    tablename,
    policyname,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND (
    qual::text LIKE '%user_profiles%' 
    OR with_check::text LIKE '%user_profiles%'
)
ORDER BY tablename, policyname;

-- 6. Estado final
SELECT '✅ VERIFICACIÓN COMPLETADA - BUSCANDO BYPASS PARA SUPER_ADMIN' as status;
