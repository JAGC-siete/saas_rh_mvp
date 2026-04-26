-- Migration: Add flags to attendance RPCs for Capa 1 UI alerts
-- Date: 2026-02-18
-- Description: Expose flags (razon, gap_minutos) so admins can see why Capa 1 was applied.

DROP FUNCTION IF EXISTS attendance_employee_timeline(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION attendance_employee_timeline(
    p_employee_id UUID DEFAULT NULL,
    p_from TEXT DEFAULT NULL,
    p_to TEXT DEFAULT NULL
) RETURNS TABLE (
    date DATE,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    lunch_start TIMESTAMPTZ,
    lunch_end TIMESTAMPTZ,
    late_minutes INTEGER,
    status TEXT,
    expected_check_in TIME,
    expected_check_out TIME,
    flags JSONB
) AS $$
BEGIN
    IF p_from IS NULL THEN p_from := CURRENT_DATE::TEXT; END IF;
    IF p_to IS NULL THEN p_to := CURRENT_DATE::TEXT; END IF;

    RETURN QUERY
    SELECT
        ar.date,
        ar.check_in,
        ar.check_out,
        ar.lunch_start,
        ar.lunch_end,
        ar.late_minutes,
        ar.status,
        ar.expected_check_in,
        ar.expected_check_out,
        ar.flags
    FROM attendance_records ar
    WHERE (p_employee_id IS NULL OR ar.employee_id = p_employee_id)
        AND ar.date BETWEEN p_from::DATE AND p_to::DATE
    ORDER BY ar.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION attendance_employee_timeline(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION attendance_employee_timeline IS 'Timeline de asistencia. Incluye flags (razon, gap_minutos) para alertas Capa 1.';

-- attendance_lists_filtered: add flags for Capa 1 UI alerts
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

COMMENT ON FUNCTION attendance_lists_filtered IS 'Lista empleados filtrados por tipo de asistencia. Incluye flags para alertas Capa 1 (razon, gap_minutos).';
