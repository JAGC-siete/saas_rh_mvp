-- Migration: Seed payroll concepts and NIIF defaults for Honduras
-- Date: 2026-03-02
-- Description: payroll_concepts (global), optional chart seed template
-- Note: chart_of_accounts and accounting_mappings are per-company. Use RPC or app logic to copy defaults when company enables accounting.

-- =====================================================
-- 1. PAYROLL_CONCEPTS (global catalog)
-- =====================================================

INSERT INTO payroll_concepts (code, name, description, is_provision_payment) VALUES
  ('sueldos', 'Sueldos y Salarios', 'Gasto de nómina por centro de costo', false),
  ('retencion_ihss', 'Retención IHSS empleado', 'Cuota obrera IHSS', false),
  ('retencion_rap', 'Retención RAP empleado', 'Cuota obrera RAP', false),
  ('retencion_isr', 'Retención ISR', 'Impuesto Sobre la Renta (SAR)', false),
  ('sueldos_por_pagar', 'Sueldos por Pagar', 'Neto a pagar al empleado', false),
  ('ihss_patronal', 'IHSS Patronal', 'Aportación empleador IHSS', false),
  ('rap_patronal', 'RAP Patronal', 'Aportación empleador RAP', false),
  ('infop', 'INFOP', '1% Instituto Nacional de Formación Profesional', false),
  ('aportaciones_por_pagar', 'Aportaciones por Pagar', 'IHSS, RAP, INFOP a terceros', false),
  ('provision_13', 'Provisión Décimo Tercero', 'Provisión mensual aguinaldo', false),
  ('provision_14', 'Provisión Décimo Cuarto', 'Provisión mensual 14° salario', false),
  ('provision_vacaciones', 'Provisión Vacaciones', 'Provisión vacaciones y cesantía', false),
  ('provisiones_laborales', 'Gasto Provisiones Laborales', 'Cuenta de gasto 6103-01', false),
  ('pago_prov_13', 'Pago Décimo Tercero', 'Pago en diciembre - rebaja provisión', true),
  ('pago_prov_14', 'Pago Décimo Cuarto', 'Pago en junio - rebaja provisión', true)
ON CONFLICT (code) DO NOTHING;

-- Note: ON CONFLICT requires unique on (code). payroll_concepts has code UNIQUE. Good.

-- =====================================================
-- 2. RPC: Seed default chart and mappings for a company
-- =====================================================
-- Call this when a company first enables accounting. Idempotent per company.

CREATE OR REPLACE FUNCTION accounting_seed_company_defaults(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ventas_id UUID;
  v_admin_id UUID;
  v_produccion_id UUID;
  v_cargas_id UUID;
  v_prov_id UUID;
  v_2101_id UUID;
  v_2102_ihss_id UUID;
  v_2102_rap_id UUID;
  v_2102_isr_id UUID;
  v_2103_id UUID;
  v_2104_13_id UUID;
  v_2104_14_id UUID;
  v_2104_vac_id UUID;
  v_2103_infop_id UUID;
  v_sueldos UUID;
  v_ihss UUID;
  v_rap UUID;
  v_isr UUID;
  v_sp UUID;
  v_ihss_p UUID;
  v_rap_p UUID;
  v_infop UUID;
  v_ap UUID;
  v_p13 UUID;
  v_p14 UUID;
  v_pvac UUID;
  v_pl UUID;
  v_pp13 UUID;
  v_pp14 UUID;
BEGIN
  -- Insert default NIIF chart (Honduras)
  INSERT INTO chart_of_accounts (company_id, code, name, account_type)
  VALUES
    (p_company_id, '6101-01', 'Gasto - Sueldos y Salarios (Ventas)', 'gasto'),
    (p_company_id, '6101-02', 'Gasto - Sueldos y Salarios (Administración)', 'gasto'),
    (p_company_id, '6101-03', 'Costo - Sueldos y Salarios (Producción)', 'gasto'),
    (p_company_id, '6102-01', 'Gasto - Cargas Sociales (IHSS, RAP, INFOP)', 'gasto'),
    (p_company_id, '6103-01', 'Gasto - Provisiones Laborales', 'gasto'),
    (p_company_id, '2101-01', 'Pasivo - Sueldos por Pagar', 'pasivo'),
    (p_company_id, '2102-01', 'Pasivo - Retenciones por pagar IHSS', 'pasivo'),
    (p_company_id, '2102-02', 'Pasivo - Retenciones por pagar RAP', 'pasivo'),
    (p_company_id, '2102-03', 'Pasivo - Retenciones por pagar ISR (SAR)', 'pasivo'),
    (p_company_id, '2103-01', 'Pasivo - Aportaciones por Pagar (IHSS, RAP)', 'pasivo'),
    (p_company_id, '2103-02', 'Pasivo - INFOP por Pagar', 'pasivo'),
    (p_company_id, '2104-01', 'Pasivo - Provisión Décimo Tercero', 'pasivo'),
    (p_company_id, '2104-02', 'Pasivo - Provisión Décimo Cuarto', 'pasivo'),
    (p_company_id, '2104-03', 'Pasivo - Provisión Vacaciones / Cesantía', 'pasivo')
  ON CONFLICT (company_id, code) DO NOTHING;

  -- Get account IDs
  SELECT id INTO v_ventas_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '6101-01';
  SELECT id INTO v_admin_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '6101-02';
  SELECT id INTO v_produccion_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '6101-03';
  SELECT id INTO v_cargas_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '6102-01';
  SELECT id INTO v_prov_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '6103-01';
  SELECT id INTO v_2101_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '2101-01';
  SELECT id INTO v_2102_ihss_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '2102-01';
  SELECT id INTO v_2102_rap_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '2102-02';
  SELECT id INTO v_2102_isr_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '2102-03';
  SELECT id INTO v_2103_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '2103-01';
  SELECT id INTO v_2103_infop_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '2103-02';
  SELECT id INTO v_2104_13_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '2104-01';
  SELECT id INTO v_2104_14_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '2104-02';
  SELECT id INTO v_2104_vac_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '2104-03';

  -- Get concept IDs
  SELECT id INTO v_sueldos FROM payroll_concepts WHERE code = 'sueldos';
  SELECT id INTO v_ihss FROM payroll_concepts WHERE code = 'retencion_ihss';
  SELECT id INTO v_rap FROM payroll_concepts WHERE code = 'retencion_rap';
  SELECT id INTO v_isr FROM payroll_concepts WHERE code = 'retencion_isr';
  SELECT id INTO v_sp FROM payroll_concepts WHERE code = 'sueldos_por_pagar';
  SELECT id INTO v_ihss_p FROM payroll_concepts WHERE code = 'ihss_patronal';
  SELECT id INTO v_rap_p FROM payroll_concepts WHERE code = 'rap_patronal';
  SELECT id INTO v_infop FROM payroll_concepts WHERE code = 'infop';
  SELECT id INTO v_ap FROM payroll_concepts WHERE code = 'aportaciones_por_pagar';
  SELECT id INTO v_p13 FROM payroll_concepts WHERE code = 'provision_13';
  SELECT id INTO v_p14 FROM payroll_concepts WHERE code = 'provision_14';
  SELECT id INTO v_pvac FROM payroll_concepts WHERE code = 'provision_vacaciones';
  SELECT id INTO v_pl FROM payroll_concepts WHERE code = 'provisiones_laborales';
  SELECT id INTO v_pp13 FROM payroll_concepts WHERE code = 'pago_prov_13';
  SELECT id INTO v_pp14 FROM payroll_concepts WHERE code = 'pago_prov_14';

  -- Insert accounting mappings (skip if already exist for this company+concept)
  INSERT INTO accounting_mappings (company_id, concept_id, cost_center_type, debit_account_id, credit_account_id, is_provision_payment)
  SELECT p_company_id, v_sueldos, 'ventas', v_ventas_id, v_2101_id, false
  WHERE NOT EXISTS (SELECT 1 FROM accounting_mappings WHERE company_id = p_company_id AND concept_id = v_sueldos AND cost_center_type = 'ventas');

  INSERT INTO accounting_mappings (company_id, concept_id, debit_account_id, credit_account_id, is_provision_payment)
  SELECT p_company_id, v_ihss, NULL, v_2102_ihss_id, false
  WHERE NOT EXISTS (SELECT 1 FROM accounting_mappings WHERE company_id = p_company_id AND concept_id = v_ihss AND department_id IS NULL);

  INSERT INTO accounting_mappings (company_id, concept_id, debit_account_id, credit_account_id, is_provision_payment)
  SELECT p_company_id, v_rap, NULL, v_2102_rap_id, false
  WHERE NOT EXISTS (SELECT 1 FROM accounting_mappings WHERE company_id = p_company_id AND concept_id = v_rap AND department_id IS NULL);

  INSERT INTO accounting_mappings (company_id, concept_id, debit_account_id, credit_account_id, is_provision_payment)
  SELECT p_company_id, v_isr, NULL, v_2102_isr_id, false
  WHERE NOT EXISTS (SELECT 1 FROM accounting_mappings WHERE company_id = p_company_id AND concept_id = v_isr AND department_id IS NULL);

  INSERT INTO accounting_mappings (company_id, concept_id, cost_center_type, debit_account_id, credit_account_id, is_provision_payment)
  SELECT p_company_id, v_sueldos, 'administracion', v_admin_id, v_2101_id, false
  WHERE NOT EXISTS (SELECT 1 FROM accounting_mappings WHERE company_id = p_company_id AND concept_id = v_sueldos AND cost_center_type = 'administracion');

  INSERT INTO accounting_mappings (company_id, concept_id, cost_center_type, debit_account_id, credit_account_id, is_provision_payment)
  SELECT p_company_id, v_sueldos, 'produccion', v_produccion_id, v_2101_id, false
  WHERE NOT EXISTS (SELECT 1 FROM accounting_mappings WHERE company_id = p_company_id AND concept_id = v_sueldos AND cost_center_type = 'produccion');

  INSERT INTO accounting_mappings (company_id, concept_id, debit_account_id, credit_account_id, is_provision_payment)
  SELECT p_company_id, v_ihss_p, v_cargas_id, v_2103_id, false
  WHERE NOT EXISTS (SELECT 1 FROM accounting_mappings WHERE company_id = p_company_id AND concept_id = v_ihss_p);

  INSERT INTO accounting_mappings (company_id, concept_id, debit_account_id, credit_account_id, is_provision_payment)
  SELECT p_company_id, v_rap_p, v_cargas_id, v_2103_id, false
  WHERE NOT EXISTS (SELECT 1 FROM accounting_mappings WHERE company_id = p_company_id AND concept_id = v_rap_p);

  INSERT INTO accounting_mappings (company_id, concept_id, debit_account_id, credit_account_id, is_provision_payment)
  SELECT p_company_id, v_infop, v_cargas_id, v_2103_infop_id, false
  WHERE NOT EXISTS (SELECT 1 FROM accounting_mappings WHERE company_id = p_company_id AND concept_id = v_infop);

  INSERT INTO accounting_mappings (company_id, concept_id, debit_account_id, credit_account_id, is_provision_payment)
  SELECT p_company_id, v_p13, v_prov_id, v_2104_13_id, false
  WHERE NOT EXISTS (SELECT 1 FROM accounting_mappings WHERE company_id = p_company_id AND concept_id = v_p13);

  INSERT INTO accounting_mappings (company_id, concept_id, debit_account_id, credit_account_id, is_provision_payment)
  SELECT p_company_id, v_p14, v_prov_id, v_2104_14_id, false
  WHERE NOT EXISTS (SELECT 1 FROM accounting_mappings WHERE company_id = p_company_id AND concept_id = v_p14);

  INSERT INTO accounting_mappings (company_id, concept_id, debit_account_id, credit_account_id, is_provision_payment)
  SELECT p_company_id, v_pvac, v_prov_id, v_2104_vac_id, false
  WHERE NOT EXISTS (SELECT 1 FROM accounting_mappings WHERE company_id = p_company_id AND concept_id = v_pvac);

  -- Payment reversal mappings (13°/14° when paid)
  INSERT INTO accounting_mappings (company_id, concept_id, debit_account_id, credit_account_id, is_provision_payment)
  SELECT p_company_id, v_pp13, v_2104_13_id, v_2101_id, true
  WHERE NOT EXISTS (SELECT 1 FROM accounting_mappings WHERE company_id = p_company_id AND concept_id = v_pp13);

  INSERT INTO accounting_mappings (company_id, concept_id, debit_account_id, credit_account_id, is_provision_payment)
  SELECT p_company_id, v_pp14, v_2104_14_id, v_2101_id, true
  WHERE NOT EXISTS (SELECT 1 FROM accounting_mappings WHERE company_id = p_company_id AND concept_id = v_pp14);
END;
$$;

COMMENT ON FUNCTION accounting_seed_company_defaults IS 'Seeds default NIIF chart and accounting mappings for Honduras. Call when company enables accounting. Idempotent.';

-- Grant execute to authenticated (will be called from API with company context)
GRANT EXECUTE ON FUNCTION accounting_seed_company_defaults TO authenticated;
GRANT EXECUTE ON FUNCTION accounting_seed_company_defaults TO service_role;
