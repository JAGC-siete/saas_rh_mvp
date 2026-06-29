-- Sync approved paid leave with attendance KPIs/lists and payroll day credits.

CREATE OR REPLACE FUNCTION public.employee_has_approved_paid_leave_on_date(
  p_employee_id UUID,
  p_date DATE
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leave_requests lr
    INNER JOIN public.leave_types lt ON lt.id = lr.leave_type_id
    WHERE lr.employee_id = p_employee_id
      AND lr.status = 'approved'
      AND COALESCE(lt.is_paid, true) = true
      AND p_date >= lr.start_date
      AND p_date <= lr.end_date
  );
$$;

COMMENT ON FUNCTION public.employee_has_approved_paid_leave_on_date(UUID, DATE) IS
  'True when the employee has an approved leave request with is_paid on the given date.';

GRANT EXECUTE ON FUNCTION public.employee_has_approved_paid_leave_on_date(UUID, DATE) TO authenticated;

CREATE OR REPLACE FUNCTION public.payroll_paid_leave_work_day_credits(
  p_company_id UUID,
  p_from DATE,
  p_to DATE,
  p_employee_ids UUID[] DEFAULT NULL
)
RETURNS TABLE(
  employee_id UUID,
  paid_leave_days NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH employees_scope AS (
    SELECT e.id, e.company_id, e.work_schedule_id
    FROM public.employees e
    WHERE e.company_id = p_company_id
      AND e.status = 'active'
      AND (p_employee_ids IS NULL OR e.id = ANY(p_employee_ids))
  ),
  check_in_days AS (
    SELECT ar.employee_id, ar.date::date AS d
    FROM public.attendance_records ar
    WHERE ar.check_in IS NOT NULL
      AND ar.date BETWEEN p_from AND p_to
      AND ar.employee_id IN (SELECT es.id FROM employees_scope es)
  ),
  paid_leave_calendar AS (
    SELECT
      lr.employee_id,
      gs.d::date AS leave_date,
      lr.duration_type,
      lr.is_half_day,
      lr.days_requested,
      lr.start_date,
      lr.end_date
    FROM public.leave_requests lr
    INNER JOIN public.leave_types lt ON lt.id = lr.leave_type_id
    INNER JOIN employees_scope e ON e.id = lr.employee_id
    CROSS JOIN LATERAL generate_series(
      GREATEST(lr.start_date, p_from),
      LEAST(lr.end_date, p_to),
      '1 day'::interval
    ) AS gs(d)
    WHERE lr.status = 'approved'
      AND COALESCE(lt.is_paid, true) = true
  ),
  credited AS (
    SELECT
      plc.employee_id,
      plc.leave_date,
      CASE
        WHEN plc.duration_type = 'hours'
          AND COALESCE(plc.is_half_day, false)
          AND plc.start_date = plc.end_date
          AND plc.leave_date = plc.start_date
          THEN LEAST(1::numeric, GREATEST(0::numeric, COALESCE(plc.days_requested, 0.5)))
        WHEN plc.duration_type = 'hours'
          AND plc.start_date = plc.end_date
          AND plc.leave_date = plc.start_date
          THEN LEAST(1::numeric, GREATEST(0::numeric, COALESCE(plc.days_requested, 1)))
        WHEN plc.duration_type = 'days'
          AND plc.start_date = plc.end_date
          AND plc.leave_date = plc.start_date
          THEN LEAST(1::numeric, GREATEST(0::numeric, COALESCE(plc.days_requested, 1)))
        ELSE 1::numeric
      END AS day_credit
    FROM paid_leave_calendar plc
    INNER JOIN employees_scope e ON e.id = plc.employee_id
    WHERE public.is_work_day_for_employee(e.company_id, e.id, plc.leave_date, e.work_schedule_id)
      AND NOT EXISTS (
        SELECT 1
        FROM check_in_days ci
        WHERE ci.employee_id = plc.employee_id
          AND ci.d = plc.leave_date
      )
  )
  SELECT
    c.employee_id,
    ROUND(SUM(c.day_credit), 2)::numeric AS paid_leave_days
  FROM credited c
  GROUP BY c.employee_id;
END;
$$;

COMMENT ON FUNCTION public.payroll_paid_leave_work_day_credits(UUID, DATE, DATE, UUID[]) IS
  'Credits approved paid leave on work days without check-in, for payroll days_worked.';

GRANT EXECUTE ON FUNCTION public.payroll_paid_leave_work_day_credits(UUID, DATE, DATE, UUID[]) TO authenticated;

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
  permisos_pagados INTEGER,
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
        WHEN public.employee_has_approved_paid_leave_on_date(ed.employee_id, ed.work_date) THEN 'paid_leave'
        ELSE 'absent'
      END AS attendance_status,
      CASE
        WHEN ar.check_in IS NULL
          AND NOT public.employee_has_approved_paid_leave_on_date(ed.employee_id, ed.work_date) THEN 'absent'
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
    COUNT(*) FILTER (WHERE attendance_status = 'paid_leave')::INTEGER AS permisos_pagados,
    COUNT(*) FILTER (WHERE timing_status = 'early')::INTEGER AS tempranos,
    COUNT(*) FILTER (WHERE timing_status = 'late')::INTEGER AS tardes,
    COUNT(*)::INTEGER AS total_empleados
  FROM employee_attendance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION attendance_kpis_filtered(UUID, TEXT, TEXT, TEXT, UUID, UUID) TO authenticated;

COMMENT ON FUNCTION attendance_kpis_filtered IS
  'KPIs por día laborable × empleado. Ausentes excluyen permisos pagados aprobados.';

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
    CASE
      WHEN ar.check_in IS NOT NULL THEN COALESCE(ar.status, 'present')
      WHEN public.employee_has_approved_paid_leave_on_date(ed.employee_id, ed.work_date) THEN 'paid_leave'
      ELSE COALESCE(ar.status, 'absent')
    END AS status,
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
        AND NOT public.employee_has_approved_paid_leave_on_date(ed.employee_id, ed.work_date)
      WHEN 'paid_leave' THEN ar.check_in IS NULL
        AND public.employee_has_approved_paid_leave_on_date(ed.employee_id, ed.work_date)
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
  'Lista por día laborable. Tipo paid_leave = permiso con goce aprobado sin marca.';
