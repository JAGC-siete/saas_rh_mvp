-- Migration: Fix hardcoded company_id in attendance RPCs
-- Date: 2025-01-25
-- Description: Remove hardcoded company_id and use parameter instead

-- 1. Fix attendance_kpis_filtered function
DROP FUNCTION IF EXISTS attendance_kpis_filtered(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION attendance_kpis_filtered(
  p_employee_id UUID DEFAULT NULL,
  p_from TEXT DEFAULT NULL,
  p_to TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_company_id UUID DEFAULT NULL
)
RETURNS TABLE (
  presentes INTEGER,
  ausentes INTEGER,
  tempranos INTEGER,
  tardes INTEGER,
  total_empleados INTEGER
) AS $$
DECLARE
  v_from DATE;
  v_to DATE;
BEGIN
  -- Establecer fechas por defecto si no se proporcionan
  IF p_from IS NULL THEN v_from := CURRENT_DATE; ELSE v_from := p_from::DATE; END IF;
  IF p_to IS NULL THEN v_to := CURRENT_DATE; ELSE v_to := p_to::DATE; END IF;
  
  RETURN QUERY
  WITH employee_attendance AS (
    SELECT 
      e.id as employee_id,
      e.name,
      e.role,
      ws.monday_start as expected_start, -- Simplificado, se puede mejorar por día
      ar.check_in,
      ar.check_out,
      ar.late_minutes,
      ar.status,
      -- Clasificación según nueva lógica
      CASE 
        WHEN ar.check_in IS NOT NULL THEN 'present'  -- Cualquiera que hizo check-in
        ELSE 'absent'
      END as attendance_status,
      -- Clasificación de temprano/tarde según nueva lógica
      CASE 
        WHEN ar.check_in IS NULL THEN 'absent'
        WHEN ar.late_minutes < -5 THEN 'early'        -- Más de 5 min temprano
        WHEN ar.late_minutes BETWEEN -2 AND 5 THEN 'on_time'  -- Puntual (-2 a +5)
        WHEN ar.late_minutes > 5 THEN 'late'          -- Más de 5 min tarde
        ELSE 'on_time'
      END as timing_status
    FROM employees e
    LEFT JOIN work_schedules ws ON e.work_schedule_id = ws.id
    LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
      AND ar.date BETWEEN v_from AND v_to
    WHERE e.status = 'active'
      AND (p_company_id IS NULL OR e.company_id = p_company_id)
      AND (p_role IS NULL OR e.role = p_role)
      AND (p_employee_id IS NULL OR e.id = p_employee_id)
  )
  SELECT 
    -- PRESENTES: Todos los que hicieron check-in (temprano + puntual + tarde)
    COUNT(*) FILTER (WHERE attendance_status = 'present')::INTEGER as presentes,
    -- AUSENTES: Solo los que NO registraron entrada
    COUNT(*) FILTER (WHERE attendance_status = 'absent')::INTEGER as ausentes,
    -- TEMPRANOS: Solo los que llegaron >5 min antes
    COUNT(*) FILTER (WHERE timing_status = 'early')::INTEGER as tempranos,
    -- TARDE: Los que llegaron >5 min después
    COUNT(*) FILTER (WHERE timing_status = 'late')::INTEGER as tardes,
    -- TOTAL: Todos los empleados activos
    COUNT(*)::INTEGER as total_empleados
  FROM employee_attendance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix attendance_lists_filtered function
DROP FUNCTION IF EXISTS attendance_lists_filtered(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION attendance_lists_filtered(
  p_employee_id UUID DEFAULT NULL,
  p_from TEXT DEFAULT NULL,
  p_to TEXT DEFAULT NULL,
  p_type TEXT DEFAULT 'absent',
  p_role TEXT DEFAULT NULL,
  p_company_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  dni TEXT,
  employee_code TEXT,
  role TEXT,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  late_minutes INTEGER,
  status TEXT,
  date TEXT,
  team TEXT
)
AS $$
DECLARE
  v_from DATE;
  v_to DATE;
BEGIN
  -- Si no se especifica fecha, usar hoy
  IF p_from IS NULL THEN v_from := CURRENT_DATE; ELSE v_from := p_from::DATE; END IF;
  IF p_to IS NULL THEN v_to := CURRENT_DATE; ELSE v_to := p_to::DATE; END IF;

  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.dni,
    e.employee_code,
    e.role,
    ar.check_in,
    ar.check_out,
    ar.late_minutes,
    ar.status,
    ar.date::TEXT as date,
    e.role as team
  FROM employees e
  LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
    AND ar.date BETWEEN v_from AND v_to
  WHERE e.status = 'active'
    AND (p_company_id IS NULL OR e.company_id = p_company_id)
    AND (p_employee_id IS NULL OR e.id = p_employee_id)
    AND (p_role IS NULL OR e.role = p_role)
    AND (
      CASE p_type
        -- AUSENTES: No tienen registro de entrada
        WHEN 'absent' THEN ar.check_in IS NULL
        -- TARDE: Llegaron más de 5 minutos después
        WHEN 'late' THEN ar.late_minutes > 5
        -- TEMPRANO: Llegaron más de 5 minutos antes (late_minutes será negativo)
        WHEN 'early' THEN ar.late_minutes < -5
        -- PRESENTE: Cualquiera que hizo check-in
        WHEN 'present' THEN ar.check_in IS NOT NULL
        ELSE TRUE
      END
    )
  ORDER BY e.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Otorgar permisos
GRANT EXECUTE ON FUNCTION attendance_kpis_filtered(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION attendance_lists_filtered(UUID, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;

-- 4. Comentarios para documentación
COMMENT ON FUNCTION attendance_kpis_filtered IS 'Calcula KPIs de asistencia con company_id parametrizado: Presentes=todos con check-in, Tempranos=>5min antes, Tarde=>5min después, Ausentes=sin check-in';
COMMENT ON FUNCTION attendance_lists_filtered IS 'Lista empleados filtrados por tipo de asistencia con company_id parametrizado';
