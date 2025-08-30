-- Migration: Create attendance RPCs with employee filtering support
-- Date: 2025-01-15
-- Description: Create RPCs for attendance KPIs and lists with employee filtering

-- Function to get attendance KPIs with optional employee filtering
CREATE OR REPLACE FUNCTION attendance_kpis(
    p_from TEXT,
    p_to TEXT,
    p_role TEXT DEFAULT NULL,
    p_employee_id UUID DEFAULT NULL
) RETURNS TABLE (
    presentes INTEGER,
    ausentes INTEGER,
    tempranos INTEGER,
    tardes INTEGER,
    total_empleados INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH employee_attendance AS (
        SELECT 
            e.id,
            e.name,
            e.department,
            COALESCE(ws.monday_start, '08:00') as expected_start,
            COALESCE(ws.monday_end, '17:00') as expected_end,
            ar.check_in,
            ar.check_out,
            ar.late_minutes,
            ar.status,
            CASE 
                WHEN ar.check_in IS NOT NULL THEN 'present'
                ELSE 'absent'
            END as attendance_status
        FROM employees e
        LEFT JOIN work_schedules ws ON e.work_schedule_id = ws.id
        LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
            AND ar.date BETWEEN p_from::DATE AND p_to::DATE
        WHERE e.status = 'active'
            AND (p_role IS NULL OR e.department = p_role)
            AND (p_employee_id IS NULL OR e.id = p_employee_id)
    )
    SELECT 
        COUNT(*) FILTER (WHERE attendance_status = 'present') as presentes,
        COUNT(*) FILTER (WHERE attendance_status = 'absent') as ausentes,
        COUNT(*) FILTER (WHERE late_minutes < 0) as tempranos,
        COUNT(*) FILTER (WHERE late_minutes > 5) as tardes,
        COUNT(*) as total_empleados
    FROM employee_attendance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get attendance lists with optional employee filtering
CREATE OR REPLACE FUNCTION attendance_lists(
    p_scope TEXT,
    p_type TEXT,
    p_role TEXT DEFAULT NULL,
    p_employee_id UUID DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    name TEXT,
    dni TEXT,
    employee_code TEXT,
    department TEXT,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    late_minutes INTEGER,
    status TEXT,
    date DATE,
    team TEXT
) AS $$
DECLARE
    v_from DATE;
    v_to DATE;
BEGIN
    -- Determine date range based on scope
    CASE p_scope
        WHEN 'today' THEN
            v_from := CURRENT_DATE;
            v_to := CURRENT_DATE;
        WHEN 'week' THEN
            v_from := CURRENT_DATE - INTERVAL '7 days';
            v_to := CURRENT_DATE;
        WHEN 'month' THEN
            v_from := CURRENT_DATE - INTERVAL '30 days';
            v_to := CURRENT_DATE;
        ELSE
            v_from := CURRENT_DATE;
            v_to := CURRENT_DATE;
    END CASE;

    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.dni,
        e.employee_code,
        e.department,
        ar.check_in,
        ar.check_out,
        ar.late_minutes,
        ar.status,
        ar.date,
        e.department as team
    FROM employees e
    LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
        AND ar.date BETWEEN v_from AND v_to
    WHERE e.status = 'active'
        AND (p_role IS NULL OR e.department = p_role)
        AND (p_employee_id IS NULL OR e.id = p_employee_id)
        AND (
            CASE p_type
                WHEN 'absent' THEN ar.check_in IS NULL
                WHEN 'late' THEN ar.late_minutes > 5
                WHEN 'early' THEN ar.late_minutes < 0
                WHEN 'present' THEN ar.check_in IS NOT NULL
                ELSE TRUE
            END
        )
    ORDER BY e.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get employee attendance timeline
CREATE OR REPLACE FUNCTION attendance_employee_timeline(
    p_employee_id UUID,
    p_from TEXT,
    p_to TEXT
) RETURNS TABLE (
    date DATE,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    late_minutes INTEGER,
    status TEXT,
    expected_check_in TIME,
    expected_check_out TIME
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ar.date,
        ar.check_in,
        ar.check_out,
        ar.late_minutes,
        ar.status,
        ar.expected_check_in,
        ar.expected_check_out
    FROM attendance_records ar
    WHERE ar.employee_id = p_employee_id
        AND ar.date BETWEEN p_from::DATE AND p_to::DATE
    ORDER BY ar.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION attendance_kpis(TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION attendance_lists(TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION attendance_employee_timeline(UUID, DATE, DATE) TO authenticated;
