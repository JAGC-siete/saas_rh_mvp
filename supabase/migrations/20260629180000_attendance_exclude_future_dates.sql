-- Cap attendance RPC date ranges at today (America/Tegucigalpa) so future work days
-- are not counted as absences in fortnight/month views.

DROP FUNCTION IF EXISTS attendance_kpis_filtered(UUID, TEXT, TEXT, TEXT, UUID, UUID);

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
  v_today DATE;
BEGIN
  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Tegucigalpa')::DATE;
  IF p_from IS NULL THEN v_from := v_today; ELSE v_from := p_from::DATE; END IF;
  IF p_to IS NULL THEN v_to := v_today; ELSE v_to := p_to::DATE; END IF;
  IF v_to > v_today THEN v_to := v_today; END IF;
  IF v_from > v_to THEN v_from := v_to; END IF;

  RETURN QUERY
  WITH calendar AS (
    SELECT d::date AS work_date
    FROM generate_series(v_from, v_to, '1 day'::interval) AS d
  ),
  employee_days AS (
    SELECT
      e.id AS employee_id,
      e.company_id,
      cal.work_date
    FROM public.employees e
    CROSS JOIN calendar cal
    WHERE e.status = 'active'
      AND COALESCE(e.attendance_required, true) = true
      AND (p_company_id IS NULL OR e.company_id = p_company_id)
      AND (p_employee_id IS NULL OR e.id = p_employee_id)
      AND (p_role IS NULL OR e.role = p_role)
      AND (p_department_id IS NULL OR e.department_id = p_department_id)
      AND public.is_work_day_for_employee(e.company_id, e.id, cal.work_date, e.work_schedule_id)
  ),
  employee_attendance AS (
    SELECT
      ed.employee_id,
      ed.work_date,
      ar.check_in,
      ar.late_minutes,
      CASE
        WHEN ar.check_in IS NOT NULL THEN 'present'
        ELSE 'absent'
      END AS attendance_status,
      CASE
        WHEN ar.check_in IS NULL THEN 'absent'
        WHEN ar.late_minutes < -5 THEN 'early'
        WHEN ar.late_minutes BETWEEN -2 AND 5 THEN 'on_time'
        WHEN ar.late_minutes > 5 THEN 'late'
        ELSE 'on_time'
      END AS timing_status
    FROM employee_days ed
    LEFT JOIN public.attendance_records ar
      ON ar.employee_id = ed.employee_id
     AND ar.date = ed.work_date
  )
  SELECT
    COUNT(*) FILTER (WHERE attendance_status = 'present')::INTEGER AS presentes,
    COUNT(*) FILTER (WHERE attendance_status = 'absent')::INTEGER AS ausentes,
    COUNT(*) FILTER (WHERE timing_status = 'early')::INTEGER AS tempranos,
    COUNT(*) FILTER (WHERE timing_status = 'late')::INTEGER AS tardes,
    COUNT(*)::INTEGER AS total_empleados
  FROM employee_attendance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION attendance_kpis_filtered(UUID, TEXT, TEXT, TEXT, UUID, UUID) TO authenticated;

COMMENT ON FUNCTION attendance_kpis_filtered IS
  'KPIs por día laborable × empleado. Rango acotado a hoy (HN). Excluye días off, feriados y futuros.';

DROP FUNCTION IF EXISTS attendance_lists_filtered(UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID);

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
  v_today DATE;
BEGIN
  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Tegucigalpa')::DATE;
  IF p_from IS NULL THEN v_from := v_today; ELSE v_from := p_from::DATE; END IF;
  IF p_to IS NULL THEN v_to := v_today; ELSE v_to := p_to::DATE; END IF;
  IF v_to > v_today THEN v_to := v_today; END IF;
  IF v_from > v_to THEN v_from := v_to; END IF;

  RETURN QUERY
  WITH calendar AS (
    SELECT d::date AS work_date
    FROM generate_series(v_from, v_to, '1 day'::interval) AS d
  ),
  employee_days AS (
    SELECT
      e.id AS employee_id,
      cal.work_date
    FROM public.employees e
    CROSS JOIN calendar cal
    WHERE e.status = 'active'
      AND COALESCE(e.attendance_required, true) = true
      AND (p_company_id IS NULL OR e.company_id = p_company_id)
      AND (p_employee_id IS NULL OR e.id = p_employee_id)
      AND (p_role IS NULL OR e.role = p_role)
      AND (p_department_id IS NULL OR e.department_id = p_department_id)
      AND public.is_work_day_for_employee(e.company_id, e.id, cal.work_date, e.work_schedule_id)
  )
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
    COALESCE(ar.status, CASE WHEN ar.check_in IS NULL THEN 'absent' ELSE ar.status END) AS status,
    ed.work_date::TEXT AS date,
    e.role AS team,
    ar.flags
  FROM employee_days ed
  JOIN public.employees e ON e.id = ed.employee_id
  LEFT JOIN public.attendance_records ar
    ON ar.employee_id = ed.employee_id
   AND ar.date = ed.work_date
  WHERE (
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
  ORDER BY e.name, ed.work_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION attendance_lists_filtered(UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID) TO authenticated;

COMMENT ON FUNCTION attendance_lists_filtered IS
  'Lista por día laborable en rango. Rango acotado a hoy (HN). Una fila por empleado × fecha.';
