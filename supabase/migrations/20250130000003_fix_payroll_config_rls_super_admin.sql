-- Migration: Fix RLS policies for company_payroll_configs to allow super_admin access
-- Date: 2025-01-30
-- Description: Updates RLS policies to allow super_admin to access any company's payroll config,
--              even when they don't have a company_id in their profile

-- Drop existing policies
DROP POLICY IF EXISTS payroll_config_select_by_company ON public.company_payroll_configs;
DROP POLICY IF EXISTS payroll_config_admin_insert ON public.company_payroll_configs;
DROP POLICY IF EXISTS payroll_config_admin_update ON public.company_payroll_configs;
DROP POLICY IF EXISTS payroll_config_admin_delete ON public.company_payroll_configs;

-- SELECT: usuarios ven su empresa, super_admin ve todas
CREATE POLICY payroll_config_select_by_company
  ON public.company_payroll_configs
  FOR SELECT
  TO authenticated
  USING (
    -- Super admin puede ver todas las configuraciones
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'super_admin'
    )
    OR
    -- Usuarios normales solo ven su empresa
    company_id IN (
      SELECT up.company_id
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.company_id IS NOT NULL
    )
  );

-- INSERT: solo admins, super_admin puede insertar en cualquier empresa
CREATE POLICY payroll_config_admin_insert
  ON public.company_payroll_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          -- Super admin puede insertar en cualquier empresa
          up.role = 'super_admin'
          OR
          -- Company admin solo puede insertar en su empresa
          (
            up.role = 'company_admin'
            AND up.company_id = public.company_payroll_configs.company_id
          )
        )
    )
  );

-- UPDATE: solo admins, super_admin puede actualizar cualquier empresa
CREATE POLICY payroll_config_admin_update
  ON public.company_payroll_configs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          -- Super admin puede actualizar cualquier empresa
          up.role = 'super_admin'
          OR
          -- Company admin solo puede actualizar su empresa
          (
            up.role = 'company_admin'
            AND up.company_id = public.company_payroll_configs.company_id
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          -- Super admin puede actualizar cualquier empresa
          up.role = 'super_admin'
          OR
          -- Company admin solo puede actualizar su empresa
          (
            up.role = 'company_admin'
            AND up.company_id = public.company_payroll_configs.company_id
          )
        )
    )
  );

-- DELETE: solo super_admin puede eliminar (soft delete)
CREATE POLICY payroll_config_admin_delete
  ON public.company_payroll_configs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'super_admin'
    )
  );

-- Comentarios
COMMENT ON POLICY payroll_config_select_by_company ON public.company_payroll_configs IS 
  'Permite a usuarios ver configuraciones de su empresa. Super_admin puede ver todas.';

COMMENT ON POLICY payroll_config_admin_insert ON public.company_payroll_configs IS 
  'Permite a super_admin y company_admin insertar configuraciones. Super_admin puede insertar en cualquier empresa.';

COMMENT ON POLICY payroll_config_admin_update ON public.company_payroll_configs IS 
  'Permite a super_admin y company_admin actualizar configuraciones. Super_admin puede actualizar cualquier empresa.';

COMMENT ON POLICY payroll_config_admin_delete ON public.company_payroll_configs IS 
  'Solo super_admin puede eliminar configuraciones.';




