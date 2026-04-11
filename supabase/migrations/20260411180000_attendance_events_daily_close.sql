-- Daily close / immutable ingest: attendance_events extensions
-- event_uid: idempotency for biometric replays
-- local_date: calendar day in company-local context (filled at insert) for fast close queries

ALTER TABLE public.attendance_events
  ADD COLUMN IF NOT EXISTS event_uid TEXT,
  ADD COLUMN IF NOT EXISTS local_date DATE;

COMMENT ON COLUMN public.attendance_events.event_uid IS 'Stable id for dedup (e.g. SHA256 from device payload). Unique when set.';
COMMENT ON COLUMN public.attendance_events.local_date IS 'Calendar date in company TZ at ingest (e.g. America/Tegucigalpa) for daily-close queries.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_events_event_uid_unique
  ON public.attendance_events (event_uid)
  WHERE event_uid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_events_employee_local_date
  ON public.attendance_events (employee_id, local_date)
  WHERE local_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_events_employee_ts_utc
  ON public.attendance_events (employee_id, ts_utc);

-- RLS: mirror pattern for company-scoped data via employees
ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company users can view attendance_events in their company" ON public.attendance_events;
CREATE POLICY "Company users can view attendance_events in their company"
  ON public.attendance_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      INNER JOIN public.user_profiles up ON up.company_id = e.company_id
      WHERE e.id = attendance_events.employee_id
        AND up.id = auth.uid()
        AND up.company_id IS NOT NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Company admins can manage attendance_events" ON public.attendance_events;
CREATE POLICY "Company admins can manage attendance_events"
  ON public.attendance_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      INNER JOIN public.user_profiles up ON up.company_id = e.company_id
      WHERE e.id = attendance_events.employee_id
        AND up.id = auth.uid()
        AND up.role IN ('company_admin', 'hr_manager')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      INNER JOIN public.user_profiles up ON up.company_id = e.company_id
      WHERE e.id = attendance_events.employee_id
        AND up.id = auth.uid()
        AND up.role IN ('company_admin', 'hr_manager')
    )
    OR EXISTS (
      SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Service role bypasses RLS; webhook uses createAdminClient.
