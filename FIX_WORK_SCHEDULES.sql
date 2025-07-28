-- ============================================
-- PASO 1: CREAR HORARIO ESTÁNDAR Y ASIGNAR A EMPLEADOS
-- ============================================

-- 1.1 Verificar si ya existe una empresa (debería existir)
SELECT id, name FROM companies LIMIT 1;

-- 1.2 Crear horario estándar Paragon
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
    (SELECT id FROM companies LIMIT 1),
    'Horario Estándar Paragon 8AM-5PM',
    '08:00', '17:00',  -- Lunes
    '08:00', '17:00',  -- Martes  
    '08:00', '17:00',  -- Miércoles
    '08:00', '17:00',  -- Jueves
    '08:00', '17:00',  -- Viernes
    NULL, NULL,        -- Sábado (no trabajan)
    NULL, NULL,        -- Domingo (no trabajan)
    60,                -- 1 hora de almuerzo
    'America/Tegucigalpa'
) ON CONFLICT DO NOTHING;

-- 1.3 Verificar que se creó el horario
SELECT id, name, monday_start, monday_end FROM work_schedules 
WHERE name = 'Horario Estándar Paragon 8AM-5PM';

-- 1.4 Asignar horario a TODOS los empleados (activos e inactivos)
UPDATE employees 
SET 
    work_schedule_id = (
        SELECT id FROM work_schedules 
        WHERE name = 'Horario Estándar Paragon 8AM-5PM' 
        LIMIT 1
    ),
    company_id = COALESCE(company_id, (SELECT id FROM companies LIMIT 1))
WHERE work_schedule_id IS NULL;

-- 1.5 Normalizar status de empleados (Activo/Inactivo → active/inactive)
UPDATE employees 
SET status = CASE 
    WHEN status = 'Activo' THEN 'active'
    WHEN status = 'Inactivo' THEN 'inactive'
    ELSE status
END
WHERE status IN ('Activo', 'Inactivo');

-- ============================================
-- VERIFICACIONES DE INTEGRIDAD
-- ============================================

-- 2.1 Contar empleados sin horario (debería ser 0)
SELECT 
    COUNT(*) as total_empleados,
    COUNT(CASE WHEN work_schedule_id IS NULL THEN 1 END) as sin_horario,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as activos,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactivos
FROM employees;

-- 2.2 Verificar empleados con horario asignado
SELECT 
    e.name,
    e.dni,
    e.status,
    ws.name as horario_asignado,
    ws.monday_start,
    ws.monday_end
FROM employees e
LEFT JOIN work_schedules ws ON e.work_schedule_id = ws.id
WHERE e.status = 'active'
ORDER BY e.name
LIMIT 10; -- Mostrar solo 10 para verificar

-- 2.3 Detectar posibles duplicados en últimos 5 dígitos DNI
SELECT 
    RIGHT(dni, 5) as ultimos_5_digitos,
    COUNT(*) as cantidad_empleados,
    STRING_AGG(name, ' | ') as nombres
FROM employees 
WHERE status = 'active'
GROUP BY RIGHT(dni, 5)
HAVING COUNT(*) > 1;

-- 2.4 Verificar estructura final
SELECT 
    'RESUMEN FINAL' as reporte,
    COUNT(*) as total_empleados,
    COUNT(CASE WHEN work_schedule_id IS NOT NULL THEN 1 END) as con_horario,
    COUNT(CASE WHEN status = 'active' AND work_schedule_id IS NOT NULL THEN 1 END) as activos_con_horario
FROM employees;
