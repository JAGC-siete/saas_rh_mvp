-- Feriados labor_laws SLV/GTM 2026 + payroll_statutory_params 2026.
-- companies.timezone + calculate_attendance_hours_batch viven en 20260412120000_multipay_fundamentals.sql.

-- Feriados en formato existente: holidays JSONB [{ "date", "name", "movable" }]
UPDATE public.labor_laws
SET
  holidays =
    '[
      {"date": "2026-01-01", "name": "Año Nuevo", "movable": false},
      {"date": "2026-04-02", "name": "Jueves Santo", "movable": true},
      {"date": "2026-04-03", "name": "Viernes Santo", "movable": true},
      {"date": "2026-04-04", "name": "Sábado Santo", "movable": true},
      {"date": "2026-05-01", "name": "Día del Trabajo", "movable": false},
      {"date": "2026-08-06", "name": "Divino Salvador del Mundo", "movable": false},
      {"date": "2026-09-15", "name": "Independencia Nacional", "movable": false},
      {"date": "2026-11-02", "name": "Día de los Difuntos", "movable": false},
      {"date": "2026-12-25", "name": "Navidad", "movable": false}
    ]'::jsonb,
  notes =
    'Feriados 2026 SLV (referencia). Validar calendario oficial MTPS / Código de Trabajo antes de producción.',
  updated_at = NOW()
WHERE country_code = 'SLV' AND year = 2026;

UPDATE public.labor_laws
SET
  holidays =
    '[
      {"date": "2026-01-01", "name": "Año Nuevo", "movable": false},
      {"date": "2026-04-02", "name": "Jueves Santo", "movable": true},
      {"date": "2026-04-03", "name": "Viernes Santo", "movable": true},
      {"date": "2026-04-04", "name": "Sábado Santo", "movable": true},
      {"date": "2026-05-01", "name": "Día del Trabajo", "movable": false},
      {"date": "2026-06-30", "name": "Día del Ejército", "movable": false},
      {"date": "2026-09-15", "name": "Independencia", "movable": false},
      {"date": "2026-10-20", "name": "Día de la Revolución", "movable": false},
      {"date": "2026-11-01", "name": "Todos los Santos", "movable": false},
      {"date": "2026-12-24", "name": "Nochebuena", "movable": false},
      {"date": "2026-12-25", "name": "Navidad", "movable": false},
      {"date": "2026-12-31", "name": "Fin de año", "movable": false}
    ]'::jsonb,
  notes =
    'Feriados 2026 GTM (referencia). Validar calendario oficial Mintrabajo antes de producción.',
  updated_at = NOW()
WHERE country_code = 'GTM' AND year = 2026;

INSERT INTO public.payroll_statutory_params (
  country_code,
  year,
  is_active,
  statutory_config,
  source,
  notes
)
VALUES (
  'SLV',
  2026,
  true,
  $slv${
    "schemaVersion": 2,
    "engine": "SLV",
    "isss": { "employeeRate": 0.03, "employerRate": 0.075, "monthlyCeiling": 1000 },
    "afp": { "employeeRate": 0.0725, "employerRate": 0.0875 },
    "insafrop": { "employerRate": 0.01, "minEmployees": 10 },
    "isr_monthly_brackets_usd": [
      {"from": 0, "to": 550, "rate": 0, "fixed": 0},
      {"from": 550.01, "to": 895.24, "rate": 0.10, "fixed": 17.67},
      {"from": 895.25, "to": 2038.10, "rate": 0.20, "fixed": 60},
      {"from": 2038.11, "to": null, "rate": 0.30, "fixed": 288.57}
    ],
    "minimum_wage_usd": { "industry": 408.80, "maquila": 402.32, "agriculture": 305.23 },
    "disclaimer": "Datos de referencia 2026. Validar ISR (MH), ISSS tope y salarios mínimos con contador."
  }$slv$::jsonb,
  'reference_2026_seed',
  'Requiere revisión profesional local antes de activar PAYROLL_COUNTRY_SLV_ENABLED en producción.'
),
(
  'GTM',
  2026,
  true,
  $gtm${
    "schemaVersion": 2,
    "engine": "GTM",
    "igss": { "employeeRate": 0.0483, "employerRate": 0.1067 },
    "intecap": { "employerRate": 0.01 },
    "irtra": { "employerRate": 0.01 },
    "isr_annual": {
      "up_to": 300000,
      "rate": 0.05,
      "over": { "fixed": 15000, "rate": 0.07 }
    },
    "minimum_wage_gtq": {
      "ce1": { "no_agri": 4252.28, "agri": 4041.20, "maquila": 3659.73 },
      "ce2": { "no_agri": 4066.90, "agri": 3875.89, "maquila": 3471.10 }
    },
    "disclaimer": "ISR anual simplificado en app (mensual = anual/12). Confirmar tablas SAT con contador."
  }$gtm$::jsonb,
  'reference_2026_seed',
  'Requiere revisión profesional local antes de activar PAYROLL_COUNTRY_GTM_ENABLED en producción.'
)
ON CONFLICT (country_code, year) DO UPDATE SET
  statutory_config = EXCLUDED.statutory_config,
  source = EXCLUDED.source,
  notes = EXCLUDED.notes,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
