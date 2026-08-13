-- Late attendance report: RPC + cron idempotency ledger

CREATE TABLE IF NOT EXISTS public.cron_report_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  period_key TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  recipient_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cron_report_ledger_unique UNIQUE (company_id, report_type, period_key)
);

CREATE INDEX IF NOT EXISTS cron_report_ledger_company_idx
  ON public.cron_report_ledger(company_id, report_type, sent_at DESC);

ALTER TABLE public.cron_report_ledger ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.cron_report_ledger IS
  'Idempotency ledger for scheduled cron reports (e.g. late attendance per pay period).';

-- Returns JSONB: { metrics, employees[], details[] }
CREATE OR REPLACE FUNCTION public.get_late_attendance_report(
  p_company_id UUID,
  p_from DATE,
  p_to DATE,
  p_timezone TEXT DEFAULT 'America/Tegucigalpa'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metrics JSONB;
BEGIN
  WITH base AS (
    SELECT
      e.id AS employee_id,
      e.employee_code,
      e.name AS employee_name,
      e.dni,
      d.name AS department_name,
      ar.date AS record_date,
      ar.check_in,
      ar.status AS record_status,
      COALESCE(ar.justification, '') AS justification,
      ar.late_minutes AS stored_late_minutes,
      ar.expected_check_in AS stored_expected,
      resolve_effective_work_schedule_id(e.company_id, e.id, ar.date, e.work_schedule_id) AS ws_id
    FROM attendance_records ar
    JOIN employees e ON e.id = ar.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE e.company_id = p_company_id
      AND ar.date BETWEEN p_from AND p_to
      AND ar.check_in IS NOT NULL
      AND e.status = 'active'
  ),
  with_schedule AS (
    SELECT
      b.*,
      ws.name AS schedule_name,
      COALESCE(ws.late_grace_minutes, ws.grace_minutes, 5) AS grace_minutes,
      ws.shift_type,
      CASE date_to_day_key(b.record_date)
        WHEN 'monday' THEN ws.monday_start
        WHEN 'tuesday' THEN ws.tuesday_start
        WHEN 'wednesday' THEN ws.wednesday_start
        WHEN 'thursday' THEN ws.thursday_start
        WHEN 'friday' THEN ws.friday_start
        WHEN 'saturday' THEN ws.saturday_start
        WHEN 'sunday' THEN ws.sunday_start
      END AS expected_start
    FROM base b
    LEFT JOIN work_schedules ws ON ws.id = b.ws_id
  ),
  calc AS (
    SELECT
      *,
      to_char(check_in AT TIME ZONE p_timezone, 'HH24:MI') AS check_in_local,
      to_char(expected_start, 'HH24:MI') AS expected_start_local,
      CASE
        WHEN COALESCE(stored_late_minutes, 0) > 0 THEN stored_late_minutes
        WHEN expected_start IS NULL THEN NULL
        ELSE GREATEST(0, (
          EXTRACT(HOUR FROM (check_in AT TIME ZONE p_timezone)) * 60
          + EXTRACT(MINUTE FROM (check_in AT TIME ZONE p_timezone))
          - EXTRACT(HOUR FROM expected_start) * 60
          - EXTRACT(MINUTE FROM expected_start)
        ))::int
      END AS late_minutes_calc
    FROM with_schedule
    WHERE expected_start IS NOT NULL
      AND COALESCE(shift_type, 'normal') != 'flex'
  ),
  late_rows AS (
    SELECT *
    FROM calc
    WHERE late_minutes_calc IS NOT NULL
      AND late_minutes_calc > grace_minutes
  ),
  employee_agg AS (
    SELECT
      employee_id,
      employee_code,
      employee_name,
      department_name,
      COUNT(*) AS late_days,
      SUM(late_minutes_calc) AS total_late_minutes,
      ROUND(AVG(late_minutes_calc)::numeric, 1) AS avg_late_minutes,
      MAX(late_minutes_calc) AS max_late_minutes
    FROM late_rows
    GROUP BY employee_id, employee_code, employee_name, department_name
  ),
  totals AS (
    SELECT
      (SELECT COUNT(*) FROM base) AS total_attendance_records,
      (SELECT COUNT(*) FROM late_rows) AS total_late_incidents,
      (SELECT COUNT(DISTINCT employee_id) FROM late_rows) AS employees_with_late,
      (SELECT COUNT(*) FROM employees WHERE company_id = p_company_id AND status = 'active') AS active_employees
  )
  SELECT jsonb_build_object(
    'metrics', (SELECT to_jsonb(t) FROM totals t),
    'employees', COALESCE(
      (SELECT jsonb_agg(to_jsonb(ea) ORDER BY ea.late_days DESC, ea.total_late_minutes DESC)
       FROM employee_agg ea),
      '[]'::jsonb
    ),
    'details', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'employee_code', lr.employee_code,
          'employee_name', lr.employee_name,
          'department_name', lr.department_name,
          'record_date', lr.record_date,
          'expected_start', lr.expected_start_local,
          'check_in', lr.check_in_local,
          'late_minutes', lr.late_minutes_calc,
          'grace_minutes', lr.grace_minutes,
          'schedule_name', lr.schedule_name,
          'record_status', lr.record_status,
          'justification', lr.justification
        )
        ORDER BY lr.record_date, lr.employee_name
      ) FROM late_rows lr),
      '[]'::jsonb
    )
  )
  INTO v_metrics;

  RETURN v_metrics;
END;
$$;

COMMENT ON FUNCTION public.get_late_attendance_report(UUID, DATE, DATE, TEXT) IS
  'Late attendance report for a company/period. Computes tardiness from effective schedule when stored late_minutes is 0.';

GRANT EXECUTE ON FUNCTION public.get_late_attendance_report(UUID, DATE, DATE, TEXT) TO service_role;
