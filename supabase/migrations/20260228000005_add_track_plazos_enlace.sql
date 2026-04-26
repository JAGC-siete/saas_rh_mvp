-- Add track_plazos to deduction fields that support installment plans (Enlace)
-- cxc_optica, plan_dental: factura / 12 quincenas

UPDATE company_payroll_configs
SET custom_fields = jsonb_set(
  jsonb_set(
    COALESCE(custom_fields, '{}'::jsonb),
    '{cxc_optica,track_plazos}',
    'true'::jsonb
  ),
  '{plan_dental,track_plazos}',
  'true'::jsonb
)
WHERE company_id = 'c419b1a5-32de-4518-8ff2-e7ebd6318a9f'
  AND custom_fields ? 'cxc_optica';
