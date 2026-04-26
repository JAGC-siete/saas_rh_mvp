-- Migration: Add department filter to attendance RPCs
-- Date: 2026-03-04
-- Description: Add p_department_id to attendance_kpis_filtered and attendance_lists_filtered

DROP FUNCTION IF EXISTS attendance_kpis_filtered(UUID, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION attendance_kpis_filtered(
  p_employee_id UUID DEFAULT NULL,
  p_from TEXT DEFAULT NULL,
  p_to TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_department_id UUID DEFAULT NULL,
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
  IF p_from IS NULL THEN v_from := CURRENT_DATE; ELSE v_from := p_from::DATE; END IF;
  IF p_to IS NULL THEN v_to := CURRENT_DATE; ELSE v_to := p_to::DATE; END IF;

  RETURN QUERY
  WITH employee_attendance AS (
    SELECT 
      e.id as employee_id,
      e.name,
      e.role,
      ws.monday_start as expected_start,
      ar.check_in,
      ar.check_out,
      ar.late_minutes,
      ar.status,
      CASE 
        WHEN ar.check_in IS NOT NULL THEN 'present'
        ELSE 'absent'
      END as attendance_status,
      CASE 
        WHEN ar.check_in IS NULL THEN 'absent'
        WHEN ar.late_minutes < -5 THEN 'early'
        WHEN ar.late_minutes BETWEEN -2 AND 5 THEN 'on_time'
        WHEN ar.late_minutes > 5 THEN 'late'
        ELSE 'on_time'
      END as timing_status
    FROM employees e
    LEFT JOIN work_schedules ws ON e.work_schedule_id = ws.id
    LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
      AND ar.date BETWEEN v_from AND v_to
    WHERE e.status = 'active'
      AND (p_company_id IS NULL OR e.company_id = p_company_id)
      AND (p_employee_id IS NULL OR e.id = p_employee_id)
      AND (p_role IS NULL OR e.role = p_role)
      AND (p_department_id IS NULL OR e.department_id = p_department_id)
  )
  SELECT 
    COUNT(*) FILTER (WHERE attendance_status = 'present')::INTEGER as presentes,
    COUNT(*) FILTER (WHERE attendance_status = 'absent')::INTEGER as ausentes,
    COUNT(*) FILTER (WHERE timing_status = 'early')::INTEGER as tempranos,
    COUNT(*) FILTER (WHERE timing_status = 'late')::INTEGER as tardes,
    COUNT(*)::INTEGER as total_empleados
  FROM employee_attendance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION attendance_kpis_filtered(UUID, TEXT, TEXT, TEXT, UUID, UUID) TO authenticated;

COMMENT ON FUNCTION attendance_kpis_filtered IS 'Calcula KPIs de asistencia. Soporta filtro por department_id.';

DROP FUNCTION IF EXISTS attendance_lists_filtered(UUID, TEXT, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION attendance_lists_filtered(
  p_employee_id UUID DEFAULT NULL,
  p_from TEXT DEFAULT NULL,
  p_to TEXT DEFAULT NULL,
  p_type TEXT DEFAULT 'absent',
  p_role TEXT DEFAULT NULL,
  p_department_id UUID DEFAULT NULL,
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
  lunch_start TIMESTAMPTZ,
  lunch_end TIMESTAMPTZ,
  late_minutes INTEGER,
  status TEXT,
  date TEXT,
  team TEXT,
  flags JSONB
)
AS $$
DECLARE
  v_from DATE;
  v_to DATE;
BEGIN
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
    ar.lunch_start,
    ar.lunch_end,
    ar.late_minutes,
    ar.status,
    ar.date::TEXT as date,
    e.role as team,
    ar.flags
  FROM employees e
  LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
    AND ar.date BETWEEN v_from AND v_to
  WHERE e.status = 'active'
    AND (p_company_id IS NULL OR e.company_id = p_company_id)
    AND (p_employee_id IS NULL OR e.id = p_employee_id)
    AND (p_role IS NULL OR e.role = p_role)
    AND (p_department_id IS NULL OR e.department_id = p_department_id)
    AND (
      CASE p_type
        WHEN 'absent' THEN ar.check_in IS NULL
        WHEN 'late' THEN ar.late_minutes > 5
        WHEN 'early' THEN ar.late_minutes < -5
        WHEN 'present' THEN ar.check_in IS NOT NULL
        WHEN 'outside_schedule' THEN ar.check_in IS NOT NULL
          AND ar.flags IS NOT NULL
          AND (ar.flags->>'horario_no_detectado') = 'true'
        ELSE TRUE
      END
    )
  ORDER BY e.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION attendance_lists_filtered(UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID) TO authenticated;

COMMENT ON FUNCTION attendance_lists_filtered IS 'Lista empleados filtrados por tipo de asistencia. Soporta filtro por department_id.';
