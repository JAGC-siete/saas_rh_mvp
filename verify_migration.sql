SELECT 
    COUNT(*) as total_empleados,
    COUNT(CASE WHEN work_schedule_id IS NOT NULL THEN 1 END) as con_horario,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as activos,
    COUNT(CASE WHEN status = 'active' AND work_schedule_id IS NOT NULL THEN 1 END) as activos_listos_asistencia
FROM employees;

-- Verificar horarios creados
SELECT 
    id, name, monday_start, monday_end, friday_start, friday_end
FROM work_schedules 
WHERE name LIKE '%Paragon%';

-- Verificar empleados con horario (muestra de 5)
SELECT 
    e.name,
    RIGHT(e.dni, 5) as ultimos_5_dni,
    e.status,
    ws.name as horario_asignado,
    ws.monday_start,
    ws.monday_end
FROM employees e
LEFT JOIN work_schedules ws ON e.work_schedule_id = ws.id
WHERE e.status = 'active'
ORDER BY e.name
LIMIT 5;
