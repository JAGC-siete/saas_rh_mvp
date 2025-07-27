-- EJECUTA ESTO EN SUPABASE SQL EDITOR PARA VER LA ESTRUCTURA REAL
-- Copia y pega este SQL en Supabase y pásame el resultado

-- 1. Ver todas las tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Ver estructura de la tabla employees
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Ver estructura de otras tablas importantes
SELECT table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name IN ('companies', 'departments', 'work_schedules', 'attendance_records')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
