-- Migration: Migrate existing payroll configurations to database
-- Date: 2025-01-30
-- Description: Migrates PROHALCA and Almacenes EXTRA configurations from code to database

-- PROHALCA: usar horas_extras como cantidad * valor_hora_extra
INSERT INTO public.company_payroll_configs (
  company_id, calculation_type, custom_fields, calculation_config, is_active
) VALUES (
  '4dc1c9de-dd12-4e4b-b76a-783d4ee5d07c',
  'formula_based',
  '{
    "horas_extras": { "label":"Horas extras trabajadas", "type":"number","category":"earnings","required":false,"default":0 },
    "feriado_trabajado": { "label":"Día feriado trabajado (monto adicional)","type":"number","category":"earnings","required":false,"default":0 },
    "estipendio_transporte": { "label":"Estipendio de transporte","type":"number","category":"earnings","required":false,"default":0 },
    "comedor": { "label":"Descuento por comedor/cafeteria","type":"number","category":"deductions","required":false,"default":0 },
    "cooperativa_aportaciones": { "label":"Aportaciones a cooperativa","type":"number","category":"deductions","required":false,"default":0 },
    "cooperativa_retirable": { "label":"Retirable de cooperativa","type":"number","category":"deductions","required":false,"default":0 },
    "cooperativa_prestamo": { "label":"Préstamo de cooperativa","type":"number","category":"deductions","required":false,"default":0 },
    "embargo_alimentos": { "label":"Embargo de alimentos (child support)","type":"number","category":"deductions","required":false,"default":0 },
    "otras_deducciones_materiales": { "label":"Otras deducciones - Materiales","type":"number","category":"deductions","required":false,"default":0 },
    "otras_deducciones_medicamentos": { "label":"Otras deducciones - Medicamentos/Consultas","type":"number","category":"deductions","required":false,"default":0 },
    "otras_deducciones_efectivo": { "label":"Otras deducciones - Efectivo","type":"number","category":"deductions","required":false,"default":0 },
    "valor_hora_extra": { "label":"Valor de hora extra","type":"number","category":"calculation_helper","required":false,"default":0 },
    "descanso_por_turno_noche": { "label":"Compensación por turno nocturno","type":"boolean","category":"calculation_helper","required":false,"default":false },
    "doble_turno": { "label":"Compensación por doble turno","type":"boolean","category":"calculation_helper","required":false,"default":false },
    "pausa_almuerzo": { "label":"Pausa de almuerzo en minutos","type":"number","category":"calculation_helper","required":false,"default":0 }
  }'::jsonb,
  '{
    "earnings_formula": "(horas_extras * valor_hora_extra) + feriado_trabajado + estipendio_transporte",
    "deductions_formula": "comedor + cooperativa_aportaciones + cooperativa_retirable + cooperativa_prestamo + embargo_alimentos + otras_deducciones_materiales + otras_deducciones_medicamentos + otras_deducciones_efectivo",
    "custom_calculations": {
      "valor_hora_extra": "coalesce(metadata.valor_hora_extra, baseSalary / 220 * 1.5)"
    }
  }'::jsonb,
  true
)
ON CONFLICT (company_id) DO UPDATE SET
  custom_fields = EXCLUDED.custom_fields,
  calculation_config = EXCLUDED.calculation_config,
  calculation_type = EXCLUDED.calculation_type,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Almacenes EXTRA sin cambios estructurales; opcionalmente agrega lógica para dias_faltados si aplica
INSERT INTO public.company_payroll_configs (
  company_id, calculation_type, custom_fields, calculation_config, is_active
) VALUES (
  '2e4781b1-f1f5-449f-b0b1-b9cf1630f5a6',
  'formula_based',
  '{
    "incapacidad": { "label":"Pago por incapacidad (lempiras por día)","type":"number","category":"earnings","required":false,"default":0 },
    "dias_faltados": { "label":"Días faltados (afecta cálculo de horas)","type":"number","category":"calculation_helper","required":false,"default":0 },
    "prestamo_banrural": { "label":"Préstamo BANRURAL","type":"number","category":"deductions","required":false,"default":0 },
    "prestamo_celular": { "label":"Préstamo celular","type":"number","category":"deductions","required":false,"default":0 },
    "anticipo_prestamo": { "label":"Anticipo/Préstamo","type":"number","category":"deductions","required":false,"default":0 },
    "impuesto_vecinal": { "label":"Impuesto vecinal (anual - una vez al año)","type":"number","category":"deductions","required":false,"default":0 }
  }'::jsonb,
  '{
    "earnings_formula": "incapacidad",
    "deductions_formula": "prestamo_banrural + prestamo_celular + anticipo_prestamo + impuesto_vecinal"
  }'::jsonb,
  true
)
ON CONFLICT (company_id) DO UPDATE SET
  custom_fields = EXCLUDED.custom_fields,
  calculation_config = EXCLUDED.calculation_config,
  calculation_type = EXCLUDED.calculation_type,
  is_active = EXCLUDED.is_active,
  updated_at = now();

DO $$
BEGIN
  RAISE NOTICE 'Configuraciones de PROHALCA y Almacenes EXTRA migradas/actualizadas en public.company_payroll_configs';
END $$;
