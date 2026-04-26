-- Permitir que cualquier usuario autenticado con empresa asignada lea los tipos de permiso
-- de su compañía (managers con can_approve_leave, empleados en portal, etc.).
-- Las operaciones de escritura siguen acotadas por políticas existentes de admin/RRHH.

ALTER TABLE public.leave_types
  ADD COLUMN IF NOT EXISTS is_statutory boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.leave_types.is_statutory IS
  'true: tipo alineado a normativa laboral; false: política o beneficio definido por la empresa.';

DROP POLICY IF EXISTS "company_members_can_view_company_leave_types" ON public.leave_types;

CREATE POLICY "company_members_can_view_company_leave_types" ON public.leave_types
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.company_id IS NOT NULL
        AND up.company_id = leave_types.company_id
    )
  );
