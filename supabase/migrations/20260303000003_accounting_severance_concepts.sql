-- Migration: Add provision_cesantia, liquidacion concepts, 2104-04, 6104-01
-- Date: 2026-03-03
-- Description: Separate vacaciones/cesantía accounts; severance journal entry concepts

-- New payroll concepts
INSERT INTO payroll_concepts (code, name, description, is_provision_payment) VALUES
  ('provision_cesantia', 'Provisión Cesantía', 'Provisión mensual auxilio de cesantía', false),
  ('liquidacion_cesantia', 'Liquidación Cesantía', 'Uso de provisión cesantía al pagar finiquito', true),
  ('liquidacion_vacaciones', 'Liquidación Vacaciones', 'Uso de provisión vacaciones al pagar finiquito', true),
  ('gasto_indemnizacion', 'Gasto Indemnizaciones', 'Exceso no provisionado en liquidación', false)
ON CONFLICT (code) DO NOTHING;

-- Update accounting_seed_company_defaults to add 2104-04, 6104-01 and provision_cesantia mapping
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
  v_2104_ces_id UUID;
  v_6104_id UUID;
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
  v_pces UUID;
  v_pl UUID;
  v_pp13 UUID;
  v_pp14 UUID;
  v_liq_ces UUID;
  v_liq_vac UUID;
  v_gasto_ind UUID;
BEGIN
  -- Insert default NIIF chart (Honduras) - add 2104-04 and 6104-01
  INSERT INTO chart_of_accounts (company_id, code, name, account_type)
  VALUES
    (p_company_id, '6101-01', 'Gasto - Sueldos y Salarios (Ventas)', 'gasto'),
    (p_company_id, '6101-02', 'Gasto - Sueldos y Salarios (Administración)', 'gasto'),
    (p_company_id, '6101-03', 'Costo - Sueldos y Salarios (Producción)', 'gasto'),
    (p_company_id, '6102-01', 'Gasto - Cargas Sociales (IHSS, RAP, INFOP)', 'gasto'),
    (p_company_id, '6103-01', 'Gasto - Provisiones Laborales', 'gasto'),
    (p_company_id, '6104-01', 'Gasto - Indemnizaciones / Liquidaciones', 'gasto'),
    (p_company_id, '2101-01', 'Pasivo - Sueldos por Pagar', 'pasivo'),
    (p_company_id, '2102-01', 'Pasivo - Retenciones por pagar IHSS', 'pasivo'),
    (p_company_id, '2102-02', 'Pasivo - Retenciones por pagar RAP', 'pasivo'),
    (p_company_id, '2102-03', 'Pasivo - Retenciones por pagar ISR (SAR)', 'pasivo'),
    (p_company_id, '2103-01', 'Pasivo - Aportaciones por Pagar (IHSS, RAP)', 'pasivo'),
    (p_company_id, '2103-02', 'Pasivo - INFOP por Pagar', 'pasivo'),
    (p_company_id, '2104-01', 'Pasivo - Provisión Décimo Tercero', 'pasivo'),
    (p_company_id, '2104-02', 'Pasivo - Provisión Décimo Cuarto', 'pasivo'),
    (p_company_id, '2104-03', 'Pasivo - Provisión Vacaciones', 'pasivo'),
    (p_company_id, '2104-04', 'Pasivo - Provisión Cesantía', 'pasivo')
  ON CONFLICT (company_id, code) DO NOTHING;

  -- Get account IDs
  SELECT id INTO v_ventas_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '6101-01';
  SELECT id INTO v_admin_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '6101-02';
  SELECT id INTO v_produccion_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '6101-03';
  SELECT id INTO v_cargas_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '6102-01';
  SELECT id INTO v_prov_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '6103-01';
  SELECT id INTO v_6104_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '6104-01';
  SELECT id INTO v_2101_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '2101-01';
  SELECT id INTO v_2102_ihss_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '2102-01';
  SELECT id INTO v_2102_rap_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '2102-02';
  SELECT id INTO v_2102_isr_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '2102-03';
  SELECT id INTO v_2103_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '2103-01';
  SELECT id INTO v_2103_infop_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '2103-02';
  SELECT id INTO v_2104_13_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '2104-01';
  SELECT id INTO v_2104_14_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '2104-02';
  SELECT id INTO v_2104_vac_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '2104-03';
  SELECT id INTO v_2104_ces_id FROM chart_of_accounts WHERE company_id = p_company_id AND code = '2104-04';

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
  SELECT id INTO v_pces FROM payroll_concepts WHERE code = 'provision_cesantia';
  SELECT id INTO v_pl FROM payroll_concepts WHERE code = 'provisiones_laborales';
  SELECT id INTO v_pp13 FROM payroll_concepts WHERE code = 'pago_prov_13';
  SELECT id INTO v_pp14 FROM payroll_concepts WHERE code = 'pago_prov_14';
  SELECT id INTO v_liq_ces FROM payroll_concepts WHERE code = 'liquidacion_cesantia';
  SELECT id INTO v_liq_vac FROM payroll_concepts WHERE code = 'liquidacion_vacaciones';
  SELECT id INTO v_gasto_ind FROM payroll_concepts WHERE code = 'gasto_indemnizacion';

  -- Existing mappings (unchanged)
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

  -- provision_vacaciones -> 2104-03 only (vacaciones)
  INSERT INTO accounting_mappings (company_id, concept_id, debit_account_id, credit_account_id, is_provision_payment)
  SELECT p_company_id, v_pvac, v_prov_id, v_2104_vac_id, false
  WHERE NOT EXISTS (SELECT 1 FROM accounting_mappings WHERE company_id = p_company_id AND concept_id = v_pvac);

  -- NEW: provision_cesantia -> 2104-04
  INSERT INTO accounting_mappings (company_id, concept_id, debit_account_id, credit_account_id, is_provision_payment)
  SELECT p_company_id, v_pces, v_prov_id, v_2104_ces_id, false
  WHERE NOT EXISTS (SELECT 1 FROM accounting_mappings WHERE company_id = p_company_id AND concept_id = v_pces);

  -- Payment reversal mappings (13°/14° when paid)
  INSERT INTO accounting_mappings (company_id, concept_id, debit_account_id, credit_account_id, is_provision_payment)
  SELECT p_company_id, v_pp13, v_2104_13_id, v_2101_id, true
  WHERE NOT EXISTS (SELECT 1 FROM accounting_mappings WHERE company_id = p_company_id AND concept_id = v_pp13);

  INSERT INTO accounting_mappings (company_id, concept_id, debit_account_id, credit_account_id, is_provision_payment)
  SELECT p_company_id, v_pp14, v_2104_14_id, v_2101_id, true
  WHERE NOT EXISTS (SELECT 1 FROM accounting_mappings WHERE company_id = p_company_id AND concept_id = v_pp14);

  -- Severance: liquidacion_cesantia (debit 2104-04, credit 2101)
  INSERT INTO accounting_mappings (company_id, concept_id, debit_account_id, credit_account_id, is_provision_payment)
  SELECT p_company_id, v_liq_ces, v_2104_ces_id, v_2101_id, true
  WHERE v_liq_ces IS NOT NULL AND NOT EXISTS (SELECT 1 FROM accounting_mappings WHERE company_id = p_company_id AND concept_id = v_liq_ces);

  -- Severance: liquidacion_vacaciones (debit 2104-03, credit 2101)
  INSERT INTO accounting_mappings (company_id, concept_id, debit_account_id, credit_account_id, is_provision_payment)
  SELECT p_company_id, v_liq_vac, v_2104_vac_id, v_2101_id, true
  WHERE v_liq_vac IS NOT NULL AND NOT EXISTS (SELECT 1 FROM accounting_mappings WHERE company_id = p_company_id AND concept_id = v_liq_vac);

  -- Severance: gasto_indemnizacion (debit 6104-01, credit 2101)
  INSERT INTO accounting_mappings (company_id, concept_id, debit_account_id, credit_account_id, is_provision_payment)
  SELECT p_company_id, v_gasto_ind, v_6104_id, v_2101_id, false
  WHERE v_gasto_ind IS NOT NULL AND NOT EXISTS (SELECT 1 FROM accounting_mappings WHERE company_id = p_company_id AND concept_id = v_gasto_ind);
END;
$$;
