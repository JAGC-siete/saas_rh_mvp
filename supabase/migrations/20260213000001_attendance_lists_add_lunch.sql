-- Migration: Add lunch_start and lunch_end to attendance_lists_filtered RPC
-- Date: 2026-02-13
-- Description: So the "Llegadas" list can show Ver detalle with Entrada, Inicio almuerzo, Fin almuerzo, Salida.
-- Clients without 4-marks get null for lunch_start/lunch_end.

DROP FUNCTION IF EXISTS attendance_lists_filtered(UUID, TEXT, TEXT, TEXT, TEXT, UUID);

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
  lunch_start TIMESTAMPTZ,
  lunch_end TIMESTAMPTZ,
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
        WHEN 'absent' THEN ar.check_in IS NULL
        WHEN 'late' THEN ar.late_minutes > 5
        WHEN 'early' THEN ar.late_minutes < -5
        WHEN 'present' THEN ar.check_in IS NOT NULL
        ELSE TRUE
      END
    )
  ORDER BY e.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION attendance_lists_filtered(UUID, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION attendance_lists_filtered IS 'Lista empleados filtrados por tipo de asistencia. Incluye lunch_start, lunch_end para detalle 4 marcas.';
