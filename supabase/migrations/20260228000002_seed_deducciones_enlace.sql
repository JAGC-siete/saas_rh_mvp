-- Migration: Seed deducciones personalizadas para cliente Enlace
-- Company: c419b1a5-32de-4518-8ff2-e7ebd6318a9f
-- Deducciones quincenales según proceso de planilla del cliente:
--   Óptica/Plan Dental: factura ÷ 12 | Seguro/ISR/Imp.Municipal: mensual ÷ 2
--   Préstamos RAP: planilla RAP ÷ 2 | Cooperativa: monto mensual ÷ 2
--   RAP/IHSS: deducciones de ley (ya en sistema)

INSERT INTO public.company_payroll_configs (
  company_id,
  calculation_type,
  custom_fields,
  calculation_config,
  payment_frequency,
  is_active
) VALUES (
  'c419b1a5-32de-4518-8ff2-e7ebd6318a9f',
  'standard',
  '{
    "cxc_optica": { "label": "CXC Óptica", "type": "number", "category": "deductions", "required": false, "default": 0 },
    "plan_dental": { "label": "Plan Dental", "type": "number", "category": "deductions", "required": false, "default": 0 },
    "seguro_medico": { "label": "Seguro Médico y Hospitalario", "type": "number", "category": "deductions", "required": false, "default": 0 },
    "isr": { "label": "ISR", "type": "number", "category": "deductions", "required": false, "default": 0 },
    "impuesto_municipal": { "label": "Impuesto Municipal", "type": "number", "category": "deductions", "required": false, "default": 0 },
    "prestamos_rap": { "label": "Préstamos RAP", "type": "number", "category": "deductions", "required": false, "default": 0 },
    "cooperativa": { "label": "Cooperativa", "type": "number", "category": "deductions", "required": false, "default": 0 }
  }'::jsonb,
  '{}'::jsonb,
  'quincenal',
  true
)
ON CONFLICT (company_id) DO UPDATE SET
  custom_fields = COALESCE(company_payroll_configs.custom_fields, '{}'::jsonb) || EXCLUDED.custom_fields,
  payment_frequency = COALESCE(company_payroll_configs.payment_frequency, EXCLUDED.payment_frequency),
  is_active = EXCLUDED.is_active,
  updated_at = now();
