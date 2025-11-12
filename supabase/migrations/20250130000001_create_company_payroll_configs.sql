-- Migration: Create company_payroll_configs table (ajustada)
-- Date: 2025-01-30
-- Description: Creates table to store payroll configurations per company in database
--              This allows scaling to 100+ companies without code deployments

-- Tabla
CREATE TABLE IF NOT EXISTS public.company_payroll_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Configuración básica
  calculation_type text DEFAULT 'standard' CHECK (calculation_type IN ('standard', 'formula_based', 'custom')),
  is_active boolean DEFAULT true,
  
  -- Campos personalizados definidos como JSONB
  custom_fields jsonb DEFAULT '{}'::jsonb,
  
  -- Configuración de cálculo (motor de fórmulas)
  calculation_config jsonb DEFAULT '{}'::jsonb,
  
  -- Script de cálculo personalizado
  calculation_script text,
  
  -- Metadata adicional
  metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Única configuración por empresa (global como solicitaste)
  UNIQUE (company_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_company_payroll_configs_company_id 
  ON public.company_payroll_configs(company_id);

CREATE INDEX IF NOT EXISTS idx_company_payroll_configs_active 
  ON public.company_payroll_configs(company_id, is_active) 
  WHERE is_active = true;

-- Índices GIN para JSONB
CREATE INDEX IF NOT EXISTS idx_company_payroll_configs_custom_fields 
  ON public.company_payroll_configs USING GIN (custom_fields);

CREATE INDEX IF NOT EXISTS idx_company_payroll_configs_calculation_config 
  ON public.company_payroll_configs USING GIN (calculation_config);

-- Función y trigger para updated_at (idempotentes)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_company_payroll_configs_updated_at ON public.company_payroll_configs;
CREATE TRIGGER update_company_payroll_configs_updated_at
  BEFORE UPDATE ON public.company_payroll_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentarios
COMMENT ON TABLE public.company_payroll_configs IS 
'Configuraciones de payroll específicas por empresa. Permite escalar a 100+ empresas sin cambios de código.';

COMMENT ON COLUMN public.company_payroll_configs.custom_fields IS 
'Definición de campos personalizados en JSONB: { "field_name": { "label": "...", "type": "number|string|boolean", "category": "earnings|deductions|calculation_helper", "required": false, "default": 0 } }';

COMMENT ON COLUMN public.company_payroll_configs.calculation_config IS 
'Configuración de fórmulas de cálculo en JSONB. Ej: {"earnings_formula":"...","deductions_formula":"...","custom_calculations":{"valor_hora_extra":"..."}}';

COMMENT ON COLUMN public.company_payroll_configs.calculation_script IS 
'Script de cálculo (JS/TS) para casos complejos. Ejecutar fuera de la DB en un runtime controlado.';

-- RLS
ALTER TABLE public.company_payroll_configs ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas previas (idempotencia ante re-ejecuciones)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'company_payroll_configs'
      AND policyname = 'Users can view their company payroll config'
  ) THEN
    EXECUTE 'DROP POLICY "Users can view their company payroll config" ON public.company_payroll_configs';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'company_payroll_configs'
      AND policyname = 'Only admins can modify payroll config'
  ) THEN
    EXECUTE 'DROP POLICY "Only admins can modify payroll config" ON public.company_payroll_configs';
  END IF;
END $$;

-- SELECT: usuarios solo ven su empresa
CREATE POLICY payroll_config_select_by_company
  ON public.company_payroll_configs
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT up.company_id
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
    )
  );

-- INSERT: solo admins de la misma empresa
CREATE POLICY payroll_config_admin_insert
  ON public.company_payroll_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin','company_admin')
        AND up.company_id = public.company_payroll_configs.company_id
    )
  );

-- UPDATE: solo admins de la misma empresa
CREATE POLICY payroll_config_admin_update
  ON public.company_payroll_configs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin','company_admin')
        AND up.company_id = public.company_payroll_configs.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin','company_admin')
        AND up.company_id = public.company_payroll_configs.company_id
    )
  );

-- DELETE: solo admins de la misma empresa
CREATE POLICY payroll_config_admin_delete
  ON public.company_payroll_configs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin','company_admin')
        AND up.company_id = public.company_payroll_configs.company_id
    )
  );
