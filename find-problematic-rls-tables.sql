-- ENCONTRAR TABLAS RLS PROBLEMÁTICAS
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Ver TODAS las tablas que tienen RLS habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;

-- 2. Ver TODAS las políticas RLS activas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Verificar tablas que se acceden durante el login
-- Estas son las más probables de causar problemas:
SELECT 'TABLAS CRÍTICAS PARA LOGIN:' as info;

-- 4. Verificar si hay políticas RLS problemáticas en tablas críticas
SELECT 
    'POLÍTICAS PROBLEMÁTICAS EN TABLAS CRÍTICAS:' as info,
    p.tablename,
    p.policyname,
    p.qual,
    p.with_check
FROM pg_policies p
WHERE p.schemaname = 'public' 
AND p.tablename IN (
    'employees',
    'companies', 
    'departments',
    'attendance_records',
    'payroll_records',
    'leave_requests'
)
AND (
    p.qual::text LIKE '%auth.uid%' 
    OR p.qual::text LIKE '%user_profiles%'
    OR p.with_check::text LIKE '%auth.uid%'
    OR p.with_check::text LIKE '%user_profiles%'
);

-- 5. Verificar si hay triggers que se ejecuten durante el login
SELECT 
    'TRIGGERS EN TABLAS CRÍTICAS:' as info,
    trigger_name,
    event_object_table,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table IN (
    'employees',
    'companies',
    'departments', 
    'attendance_records',
    'payroll_records',
    'leave_requests'
)
ORDER BY event_object_table, trigger_name;
