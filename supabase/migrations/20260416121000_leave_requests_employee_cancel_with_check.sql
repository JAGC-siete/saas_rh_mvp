-- Permitir que el empleado cancele (pending -> cancelled) sin violar RLS WITH CHECK en UPDATE
DROP POLICY IF EXISTS "employees_can_update_own_pending_leave_requests" ON public.leave_requests;

CREATE POLICY "employees_can_update_own_pending_leave_requests" ON public.leave_requests
  FOR UPDATE
  USING (
    employee_id IN (
      SELECT employee_id FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
    )
    AND status = 'pending'
  )
  WITH CHECK (
    employee_id IN (
      SELECT employee_id FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  );
