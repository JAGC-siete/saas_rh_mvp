-- Migration: Add lunch_start and lunch_end to attendance_employee_timeline RPC
-- Date: 2026-02-14
-- Description: So "Historial Reciente" in EmployeeDrawer shows Inicio almuerzo and Fin almuerzo when present.
-- Requires: 20260212000001_add_lunch_to_attendance_records.sql (attendance_records must have lunch_start, lunch_end).

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
    expected_check_out TIME
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
        ar.expected_check_out
    FROM attendance_records ar
    WHERE (p_employee_id IS NULL OR ar.employee_id = p_employee_id)
        AND ar.date BETWEEN p_from::DATE AND p_to::DATE
    ORDER BY ar.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION attendance_employee_timeline(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION attendance_employee_timeline IS 'Timeline de asistencia por empleado. Incluye lunch_start, lunch_end para Historial Reciente (4 marcas).';
