-- Work schedules: permission-based INSERT for managers; UPDATE/DELETE for admins only
-- Date: 2026-05-20

CREATE SCHEMA IF NOT EXISTS app_private;

CREATE OR REPLACE FUNCTION app_private.user_can_create_work_schedules(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app_private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = p_user_id
      AND up.company_id IS NOT NULL
      AND (
        up.role IN ('company_admin', 'hr_manager', 'super_admin', 'admin')
        OR COALESCE((up.permissions->>'can_create_work_schedules')::boolean, false) = true
        OR COALESCE((up.permissions->>'can_manage_settings')::boolean, false) = true
      )
  );
$$;

CREATE OR REPLACE FUNCTION app_private.user_can_manage_work_schedules(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app_private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = p_user_id
      AND up.company_id IS NOT NULL
      AND (
        up.role IN ('company_admin', 'hr_manager', 'super_admin', 'admin')
        OR COALESCE((up.permissions->>'can_manage_settings')::boolean, false) = true
      )
  );
$$;

REVOKE ALL ON FUNCTION app_private.user_can_create_work_schedules(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.user_can_manage_work_schedules(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.user_can_create_work_schedules(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.user_can_manage_work_schedules(UUID) TO authenticated;

DROP POLICY IF EXISTS "Company admins and HR managers can manage work schedules" ON public.work_schedules;

CREATE POLICY "work_schedules_insert_by_permission" ON public.work_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT up.company_id FROM public.user_profiles up WHERE up.id = auth.uid()
    )
    AND app_private.user_can_create_work_schedules(auth.uid())
  );

CREATE POLICY "work_schedules_update_by_permission" ON public.work_schedules
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT up.company_id FROM public.user_profiles up WHERE up.id = auth.uid()
    )
    AND app_private.user_can_manage_work_schedules(auth.uid())
  )
  WITH CHECK (
    company_id IN (
      SELECT up.company_id FROM public.user_profiles up WHERE up.id = auth.uid()
    )
    AND app_private.user_can_manage_work_schedules(auth.uid())
  );

CREATE POLICY "work_schedules_delete_by_permission" ON public.work_schedules
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT up.company_id FROM public.user_profiles up WHERE up.id = auth.uid()
    )
    AND app_private.user_can_manage_work_schedules(auth.uid())
  );

COMMENT ON FUNCTION app_private.user_can_create_work_schedules(UUID) IS
  'INSERT work_schedules: admins/HR or explicit can_create_work_schedules / can_manage_settings in user JSON.';
