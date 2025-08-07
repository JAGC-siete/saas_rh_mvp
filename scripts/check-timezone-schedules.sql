-- VERIFICAR Y CORREGIR TIMEZONE EN WORK_SCHEDULES
-- Ejecutar para validar que todos los horarios usen Tegucigalpa

-- 1. Verificar timezone actual
SELECT 
  id,
  name,
  timezone,
  monday_start,
  monday_end,
  created_at
FROM work_schedules
ORDER BY created_at DESC;

-- 2. Contar registros con timezone incorrecto
SELECT 
  timezone,
  COUNT(*) as count
FROM work_schedules
GROUP BY timezone;

-- 3. Corregir timezone si es necesario (descomentar para ejecutar)
-- UPDATE work_schedules 
-- SET timezone = 'America/Tegucigalpa' 
-- WHERE timezone != 'America/Tegucigalpa';

-- 4. Verificar después de la corrección
-- SELECT 
--   id,
--   name,
--   timezone,
--   monday_start,
--   monday_end
-- FROM work_schedules
-- ORDER BY created_at DESC; 