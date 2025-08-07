-- Quick Fix: Verificar y configurar zona horaria para Tegucigalpa
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar configuración actual de zona horaria
SELECT 
    name,
    settings,
    created_at,
    updated_at
FROM companies 
LIMIT 1;

-- 2. Actualizar configuración de zona horaria en companies
UPDATE companies 
SET 
    settings = COALESCE(settings, '{}'::jsonb) || '{"timezone": "America/Tegucigalpa", "currency": "HNL", "language": "es"}'::jsonb,
    updated_at = NOW()
WHERE id IN (SELECT id FROM companies LIMIT 1);

-- 3. Verificar work_schedules
SELECT 
    id,
    name,
    timezone,
    monday_start,
    monday_end
FROM work_schedules 
LIMIT 5;

-- 4. Asegurar que todos los work_schedules tengan zona horaria correcta
UPDATE work_schedules 
SET 
    timezone = 'America/Tegucigalpa',
    updated_at = NOW()
WHERE timezone IS NULL OR timezone != 'America/Tegucigalpa';

-- 5. Verificar configuración final
SELECT 
    'Companies' as table_name,
    name,
    settings->>'timezone' as timezone
FROM companies 
UNION ALL
SELECT 
    'Work Schedules' as table_name,
    name,
    timezone
FROM work_schedules 
LIMIT 10; 