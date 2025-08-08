-- MIGRACIÓN PARA DATOS DE PARAGON A ESQUEMA EXISTENTE
-- Este script ajusta las columnas faltantes y migra los datos

-- 1. La tabla employees ya tiene todas las columnas necesarias según el esquema:
-- employee_code, dni, name, role, position, base_salary, hire_date, 
-- status, bank_name, bank_account ya existen

-- 2. Crear un horario de trabajo estándar para los empleados de Paragon
-- (8:00 AM - 5:00 PM, Lunes a Viernes)
INSERT INTO work_schedules (
    id,
    company_id,
    name,
    monday_start, monday_end,
    tuesday_start, tuesday_end,
    wednesday_start, wednesday_end,
    thursday_start, thursday_end,
    friday_start, friday_end,
    saturday_start, saturday_end,
    sunday_start, sunday_end,
    break_duration,
    timezone
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM companies LIMIT 1), -- Asumiendo que tienes una empresa
    'Horario Estándar Paragon',
    '08:00:00', '17:00:00',  -- Lunes
    '08:00:00', '17:00:00',  -- Martes
    '08:00:00', '17:00:00',  -- Miércoles
    '08:00:00', '17:00:00',  -- Jueves
    '08:00:00', '17:00:00',  -- Viernes
    NULL, NULL,              -- Sábado (no trabajado)
    NULL, NULL,              -- Domingo (no trabajado)
    60,                      -- 1 hora de break
    'America/Tegucigalpa'
)
ON CONFLICT DO NOTHING;

-- 3. Función para limpiar y separar nombres
CREATE OR REPLACE FUNCTION split_full_name(full_name TEXT)
RETURNS TABLE(first_name TEXT, last_name TEXT) AS $$
DECLARE
    name_parts TEXT[];
BEGIN
    -- Dividir el nombre por espacios
    name_parts := string_to_array(trim(full_name), ' ');
    
    IF array_length(name_parts, 1) = 1 THEN
        -- Solo un nombre
        first_name := name_parts[1];
        last_name := '';
    ELSIF array_length(name_parts, 1) = 2 THEN
        -- Nombre y apellido
        first_name := name_parts[1];
        last_name := name_parts[2];
    ELSIF array_length(name_parts, 1) = 3 THEN
        -- Dos nombres, un apellido
        first_name := name_parts[1] || ' ' || name_parts[2];
        last_name := name_parts[3];
    ELSE
        -- Más de 3 partes: primeras partes como nombre, última como apellido
        first_name := array_to_string(name_parts[1:array_length(name_parts,1)-1], ' ');
        last_name := name_parts[array_length(name_parts, 1)];
    END IF;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 4. Comentarios sobre la migración de datos
-- 
-- Para migrar los datos de tu archivo employees_202504060814.sql:
-- 
-- 1. Ejecuta este script primero para preparar la estructura
-- 2. Luego ejecuta el script de Python modificado que generará INSERTs 
--    compatibles con tu esquema existente
-- 3. Los datos se insertarán en:
--    - employees: información del empleado
--    - work_schedules: horarios asignados (o usar el estándar creado arriba)
--    - attendance_records: registros históricos si los necesitas

-- NOTA: 
-- - Asegúrate de tener al menos una company creada antes de insertar empleados
-- - Los empleados necesitarán company_id y work_schedule_id
-- - El campo 'role' en employees se mapeará directamente desde tus datos
-- - Los campos position, employee_code se pueden llenar según necesites
