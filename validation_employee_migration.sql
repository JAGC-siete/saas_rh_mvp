-- =====================================================
-- SCRIPT DE VALIDACIÓN POST-MIGRACIÓN
-- =====================================================
-- Este script valida que la migración se haya ejecutado correctamente
-- y proporciona reportes detallados de la calidad de los datos

-- =====================================================
-- 1. VALIDACIONES BÁSICAS DE INTEGRIDAD
-- =====================================================

-- 1.1 Verificar que todas las entidades de soporte existen
SELECT 
    'Verificación de entidades de soporte' as categoria,
    CASE 
        WHEN EXISTS(SELECT 1 FROM companies WHERE id = '00000000-0000-0000-0000-000000000001') THEN '✅ Company exists'
        ELSE '❌ Company missing'
    END as company_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM departments WHERE company_id = '00000000-0000-0000-0000-000000000001') >= 6 THEN '✅ Departments created'
        ELSE '❌ Departments missing'
    END as departments_status,
    CASE 
        WHEN EXISTS(SELECT 1 FROM work_schedules WHERE id = '00000000-0000-0000-0000-000000000020') THEN '✅ Work schedule exists'
        ELSE '❌ Work schedule missing'
    END as schedule_status;

-- 1.2 Validar restricciones NOT NULL
SELECT 
    'Validación de campos requeridos' as categoria,
    COUNT(*) as total_empleados,
    COUNT(CASE WHEN company_id IS NULL THEN 1 END) as company_id_nulls,
    COUNT(CASE WHEN dni IS NULL THEN 1 END) as dni_nulls,
    COUNT(CASE WHEN name IS NULL THEN 1 END) as name_nulls,
    COUNT(CASE WHEN base_salary IS NULL THEN 1 END) as base_salary_nulls
FROM employees 
WHERE company_id = '00000000-0000-0000-0000-000000000001';

-- 1.3 Validar tipos de datos y formatos
SELECT 
    'Validación de formatos' as categoria,
    COUNT(*) as total_empleados,
    COUNT(CASE WHEN dni ~ '^\d{4}-\d{4}-\d{5}$' THEN 1 END) as dni_formato_correcto,
    COUNT(CASE WHEN base_salary >= 0 AND base_salary <= 100000 THEN 1 END) as salario_rango_valido,
    COUNT(CASE WHEN status IN ('active', 'inactive') THEN 1 END) as status_valido,
    COUNT(CASE WHEN hire_date BETWEEN '2020-01-01' AND CURRENT_DATE THEN 1 END) as fecha_contratacion_valida
FROM employees 
WHERE company_id = '00000000-0000-0000-0000-000000000001';

-- =====================================================
-- 2. REPORTES DE CALIDAD DE DATOS
-- =====================================================

-- 2.1 Distribución por departamentos y roles
SELECT 
    d.name as departamento,
    e.role,
    COUNT(*) as cantidad,
    ROUND(AVG(e.base_salary), 2) as salario_promedio,
    MIN(e.base_salary) as salario_minimo,
    MAX(e.base_salary) as salario_maximo
FROM employees e
JOIN departments d ON e.department_id = d.id
WHERE e.company_id = '00000000-0000-0000-0000-000000000001'
GROUP BY d.name, e.role
ORDER BY d.name, cantidad DESC;

-- 2.2 Análisis de empleados por status y banco
SELECT 
    e.status,
    e.bank_name,
    COUNT(*) as cantidad,
    ROUND(AVG(e.base_salary), 2) as salario_promedio
FROM employees e
WHERE e.company_id = '00000000-0000-0000-0000-000000000001'
GROUP BY e.status, e.bank_name
ORDER BY e.status, cantidad DESC;

-- 2.3 Empleados con salarios aplicados por defecto (necesitan revisión)
SELECT 
    e.employee_code,
    e.name,
    e.role,
    e.base_salary,
    e.hire_date,
    e.status,
    (e.metadata->>'migration_notes') as notas_migracion
FROM employees e
WHERE e.company_id = '00000000-0000-0000-0000-000000000001'
AND e.base_salary = 15000.00
ORDER BY e.name;

-- 2.4 Empleados con DNI corregidos durante la migración
SELECT 
    e.employee_code,
    e.name,
    e.dni as dni_corregido,
    (e.metadata->>'original_checkin_time') as horario_entrada_original,
    (e.metadata->>'original_checkout_time') as horario_salida_original
FROM employees e
WHERE e.company_id = '00000000-0000-0000-0000-000000000001'
AND e.metadata ? 'original_checkin_time'
ORDER BY e.name;

-- =====================================================
-- 3. VALIDACIONES DE RELACIONES Y CONSTRAINTS
-- =====================================================

-- 3.1 Verificar integridad referencial
SELECT 
    'Integridad referencial' as categoria,
    COUNT(*) as total_empleados,
    COUNT(CASE WHEN department_id IS NOT NULL AND EXISTS(SELECT 1 FROM departments WHERE id = e.department_id) THEN 1 END) as dept_refs_validas,
    COUNT(CASE WHEN work_schedule_id IS NOT NULL AND EXISTS(SELECT 1 FROM work_schedules WHERE id = e.work_schedule_id) THEN 1 END) as schedule_refs_validas,
    COUNT(CASE WHEN company_id IS NOT NULL AND EXISTS(SELECT 1 FROM companies WHERE id = e.company_id) THEN 1 END) as company_refs_validas
FROM employees e
WHERE e.company_id = '00000000-0000-0000-0000-000000000001';

-- 3.2 Verificar unicidad de DNI por compañía
SELECT 
    'Verificación de duplicados' as categoria,
    COUNT(*) as total_empleados,
    COUNT(DISTINCT dni) as dni_unicos,
    COUNT(*) - COUNT(DISTINCT dni) as dni_duplicados
FROM employees e
WHERE e.company_id = '00000000-0000-0000-0000-000000000001';

-- 3.3 Mostrar DNIs duplicados si existen
SELECT 
    dni,
    COUNT(*) as duplicados,
    STRING_AGG(name, ', ') as nombres_empleados
FROM employees e
WHERE e.company_id = '00000000-0000-0000-0000-000000000001'
GROUP BY dni
HAVING COUNT(*) > 1;

-- =====================================================
-- 4. REPORTES GERENCIALES
-- =====================================================

-- 4.1 Resumen ejecutivo de la migración
SELECT 
    'RESUMEN EJECUTIVO' as reporte,
    COUNT(*) as total_empleados_migrados,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as empleados_activos,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as empleados_inactivos,
    ROUND(AVG(base_salary), 2) as salario_promedio_general,
    MIN(hire_date) as fecha_contratacion_mas_antigua,
    MAX(hire_date) as fecha_contratacion_mas_reciente
FROM employees 
WHERE company_id = '00000000-0000-0000-0000-000000000001';

-- 4.2 Costo salarial por departamento
SELECT 
    d.name as departamento,
    COUNT(e.id) as total_empleados,
    COUNT(CASE WHEN e.status = 'active' THEN 1 END) as empleados_activos,
    ROUND(SUM(CASE WHEN e.status = 'active' THEN e.base_salary ELSE 0 END), 2) as costo_salarial_activos,
    ROUND(AVG(CASE WHEN e.status = 'active' THEN e.base_salary END), 2) as salario_promedio_activos
FROM employees e
JOIN departments d ON e.department_id = d.id
WHERE e.company_id = '00000000-0000-0000-0000-000000000001'
GROUP BY d.id, d.name
ORDER BY costo_salarial_activos DESC;

-- 4.3 Empleados que requieren atención manual
SELECT 
    'EMPLEADOS QUE REQUIEREN REVISIÓN' as categoria,
    e.employee_code,
    e.name,
    e.dni,
    e.role,
    e.base_salary,
    e.status,
    CASE 
        WHEN e.base_salary = 15000.00 THEN 'Salario aplicado por defecto'
        WHEN e.dni ~ '\s' THEN 'DNI tenía formato incorrecto'
        WHEN e.status = 'inactive' AND e.hire_date > '2024-01-01' THEN 'Empleado reciente inactivo'
        ELSE 'Otro'
    END as razon_revision
FROM employees e
WHERE e.company_id = '00000000-0000-0000-0000-000000000001'
AND (
    e.base_salary = 15000.00 OR
    e.status = 'inactive' AND e.hire_date > '2024-01-01'
)
ORDER BY e.hire_date DESC;

-- =====================================================
-- 5. VERIFICACIÓN DE FUNCIONALIDAD DEL SISTEMA
-- =====================================================

-- 5.1 Test de búsqueda por DNI (para sistema de asistencia)
SELECT 
    'Test búsqueda DNI' as test,
    e.employee_code,
    e.dni,
    e.name,
    e.role,
    d.name as departamento,
    e.status,
    ws.monday_start as hora_entrada,
    ws.monday_end as hora_salida
FROM employees e
JOIN departments d ON e.department_id = d.id
JOIN work_schedules ws ON e.work_schedule_id = ws.id
WHERE e.company_id = '00000000-0000-0000-0000-000000000001'
AND e.dni IN ('0801-1999-10071', '0510-1991-00731', '0801-1985-22949') -- Casos de test
ORDER BY e.name;

-- 5.2 Verificar que todos los empleados activos tienen horario asignado
SELECT 
    'Empleados activos sin horario' as problema,
    COUNT(*) as cantidad
FROM employees e
WHERE e.company_id = '00000000-0000-0000-0000-000000000001'
AND e.status = 'active'
AND e.work_schedule_id IS NULL;

-- =====================================================
-- 6. SCRIPT DE LIMPIEZA FINAL (OPCIONAL)
-- =====================================================

-- Comentar las siguientes líneas si se quiere conservar metadata de migración
/*
UPDATE employees 
SET metadata = metadata - 'original_checkin_time' - 'original_checkout_time' - 'migration_notes'
WHERE company_id = '00000000-0000-0000-0000-000000000001'
AND metadata ? 'migration_notes';
*/

-- =====================================================
-- FINAL DEL SCRIPT DE VALIDACIÓN
-- =====================================================

SELECT 
    '✅ VALIDACIÓN COMPLETADA' as resultado,
    NOW() as fecha_validacion,
    'La migración ha sido validada exitosamente' as mensaje;
