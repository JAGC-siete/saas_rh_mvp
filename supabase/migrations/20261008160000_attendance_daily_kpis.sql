-- Dashboard: serie diaria de asistencia en una sola llamada.
--
-- /api/dashboard/overview necesita ~6 semanas de KPIs por día. Con attendance_kpis_filtered eso era
-- una RPC por día. Esta función aplica la misma lógica (días laborables + feriados con marca,
-- permisos pagados aprobados fuera de ausencias, tarde = late_minutes > 5) agrupada por fecha.
--
-- A diferencia de las RPC existentes, valida que el llamador pertenezca a p_company_id
-- (o sea super_admin / service_role) y acepta varios departamentos (vista de gerente).

CREATE OR REPLACE FUNCTION public.attendance_daily_kpis(
  p_company_id UUID,
  p_from DATE,
  p_to DATE,
  p_department_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  work_date DATE,
  programados INTEGER,
  presentes INTEGER,
  ausentes INTEGER,
  permisos_pagados INTEGER,
  tardes INTEGER
) AS $$
#variable_conflict use_column
DECLARE
  v_from DATE;
  v_to DATE;
  v_today DATE;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'p_company_id requerido' USING ERRCODE = '22004';
  END IF;

  IF COALESCE(auth.role(), '') <> 'service_role'
     AND p_company_id IS DISTINCT FROM public.get_user_company()
     AND NOT EXISTS (
       SELECT 1 FROM public.user_profiles up
       WHERE up.id = auth.uid() AND up.role = 'super_admin'
     ) THEN
    RAISE EXCEPTION 'Sin acceso a la empresa' USING ERRCODE = '42501';
  END IF;

  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Tegucigalpa')::DATE;
  v_to := LEAST(COALESCE(p_to, v_today), v_today);
  v_from := COALESCE(p_from, v_to);
  IF v_from > v_to THEN v_from := v_to; END IF;
  -- Tope de 93 días para que la serie no se convierta en un reporte.
  IF v_to - v_from > 92 THEN v_from := v_to - 92; END IF;

  RETURN QUERY
  WITH calendar AS (
    SELECT d::date AS work_date
    FROM generate_series(v_from, v_to, '1 day'::interval) AS d
  ),
  employee_days AS (
    SELECT e.id AS employee_id, cal.work_date
    FROM public.employees e
    CROSS JOIN calendar cal
    WHERE e.status = 'active'
      AND COALESCE(e.attendance_required, true) = true
      AND e.company_id = p_company_id
      AND (p_department_ids IS NULL OR e.department_id = ANY (p_department_ids))
      AND (
        public.is_work_day_for_employee(e.company_id, e.id, cal.work_date, e.work_schedule_id)
        OR EXISTS (
          SELECT 1 FROM public.attendance_records ar_marked
          WHERE ar_marked.employee_id = e.id
            AND ar_marked.date = cal.work_date
            AND ar_marked.check_in IS NOT NULL
        )
      )
  ),
  employee_attendance AS (
    SELECT
      ed.work_date,
      CASE
        WHEN ar.check_in IS NOT NULL THEN 'present'
        WHEN public.employee_has_approved_paid_leave_on_date(ed.employee_id, ed.work_date) THEN 'paid_leave'
        ELSE 'absent'
      END AS attendance_status,
      (ar.check_in IS NOT NULL AND ar.late_minutes > 5) AS is_late
    FROM employee_days ed
    LEFT JOIN public.attendance_records ar
      ON ar.employee_id = ed.employee_id
     AND ar.date = ed.work_date
  )
  SELECT
    ea.work_date,
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE ea.attendance_status = 'present')::INTEGER,
    COUNT(*) FILTER (WHERE ea.attendance_status = 'absent')::INTEGER,
    COUNT(*) FILTER (WHERE ea.attendance_status = 'paid_leave')::INTEGER,
    COUNT(*) FILTER (WHERE ea.is_late)::INTEGER
  FROM employee_attendance ea
  GROUP BY ea.work_date
  ORDER BY ea.work_date;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO pg_catalog, public;

REVOKE ALL ON FUNCTION public.attendance_daily_kpis(UUID, DATE, DATE, UUID[]) FROM PUBLIC;
-- Los default privileges de Supabase otorgan EXECUTE a anon en funciones nuevas de public.
REVOKE EXECUTE ON FUNCTION public.attendance_daily_kpis(UUID, DATE, DATE, UUID[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.attendance_daily_kpis(UUID, DATE, DATE, UUID[]) TO authenticated, service_role;

COMMENT ON FUNCTION public.attendance_daily_kpis IS
  'Serie diaria (máx. 93 días) con la lógica de attendance_kpis_filtered; valida pertenencia a la empresa.';
