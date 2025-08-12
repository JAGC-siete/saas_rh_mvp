-- DIAGNÓSTICO DEL SCHEMA DE AUTH
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar si existe el schema auth
SELECT '=== SCHEMA AUTH ===' as info;
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'auth';

-- 2. Verificar tablas en schema auth
SELECT '=== TABLAS EN SCHEMA AUTH ===' as info;
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'auth'
ORDER BY table_name;

-- 3. Verificar si existe la tabla auth.users
SELECT '=== TABLA AUTH.USERS ===' as info;
SELECT 
    table_name,
    table_schema,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'auth' AND table_name = 'users';

-- 4. Verificar columnas de auth.users si existe
SELECT '=== COLUMNAS DE AUTH.USERS ===' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'auth' AND table_name = 'users'
ORDER BY ordinal_position;

-- 5. Verificar si hay datos en auth.users
SELECT '=== DATOS EN AUTH.USERS ===' as info;
SELECT COUNT(*) as total_users FROM auth.users;

-- 6. Verificar políticas RLS en auth.users
SELECT '=== POLÍTICAS RLS EN AUTH.USERS ===' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'auth' AND tablename = 'users';

-- 7. Verificar permisos del usuario anon
SELECT '=== PERMISOS USUARIO ANON ===' as info;
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges 
WHERE grantee = 'anon' AND table_schema = 'auth';

-- 8. Verificar si hay errores en el log
SELECT '=== ESTADO DE LA BASE DE DATOS ===' as info;
SELECT 
    datname,
    state,
    backend_start,
    state_change
FROM pg_stat_activity 
WHERE datname = current_database();
