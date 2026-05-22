-- Resolve effective work_schedule_id from employee_schedule_assignments + employee default.

CREATE OR REPLACE FUNCTION public.resolve_effective_work_schedule_id(
  p_company_id UUID,
  p_employee_id UUID,
  p_date DATE,
  p_fallback UUID
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_row RECORD;
  v_dow INTEGER;
  v_weekdays SMALLINT[];
BEGIN
  v_dow := EXTRACT(DOW FROM p_date)::INTEGER;

  FOR v_row IN
    SELECT work_schedule_id, repeat_weekly, repeat_weekdays
    FROM public.employee_schedule_assignments
    WHERE company_id = p_company_id
      AND employee_id = p_employee_id
      AND valid_from <= p_date
      AND valid_to >= p_date
    ORDER BY valid_from DESC
  LOOP
    IF v_row.repeat_weekly IS TRUE THEN
      v_weekdays := v_row.repeat_weekdays;
      IF v_weekdays IS NOT NULL AND array_length(v_weekdays, 1) > 0 THEN
        IF NOT (v_dow = ANY(v_weekdays)) THEN
          CONTINUE;
        END IF;
      END IF;
    END IF;
    RETURN v_row.work_schedule_id;
  END LOOP;

  RETURN p_fallback;
END;
$$;

COMMENT ON FUNCTION public.resolve_effective_work_schedule_id(UUID, UUID, DATE, UUID) IS
  'Effective schedule for a date: assignment (with repeat_weekly filter) then employee default.';
