-- Colombia (COL), fase 1: el país existe en la base, pero su motor de nómina sigue apagado
-- (PAYROLL_COUNTRY_COL_ENABLED=OFF en la app y payroll_statutory_params.is_active = false aquí).
-- 1) CHECK de país en companies y payroll_statutory_params acepta COL.
-- 2) labor_laws COL 2026: festivos (Ley Emiliani) para asistencia; columnas fiscales sin uso.
-- 3) payroll_statutory_params COL 2026 INACTIVO, con vigencias por fecha. Pendiente de validación
--    por un contador colombiano antes de activarlo. Valores: Decreto 0159 de 2026 (SMMLV transitorio),
--    Decreto 1470 de 2025 (auxilio), DIAN Res. 000238 de 2025 (UVT), Ley 2101 de 2021 (jornada),
--    Ley 2466 de 2025 (nocturno desde 19:00, recargo dominical/festivo 80 % → 90 % el 1-jul-2026).
-- Los JSON de festivos y parámetros los verifica tests/colombia-country-base.test.ts.

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_country_code_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_country_code_check
  CHECK (country_code IN ('HND', 'SLV', 'GTM', 'COL'));

ALTER TABLE public.payroll_statutory_params
  DROP CONSTRAINT IF EXISTS payroll_statutory_params_country_check;

ALTER TABLE public.payroll_statutory_params
  ADD CONSTRAINT payroll_statutory_params_country_check
  CHECK (country_code IN ('HND', 'SLV', 'GTM', 'COL'));

INSERT INTO public.labor_laws (
  country_code, year, is_active,
  legal_daily_hours, legal_weekly_hours, legal_weekly_days,
  overtime_threshold_hours, overtime_diurno_rate, overtime_nocturno_rate, overtime_feriado_rate,
  mandatory_break_minutes, break_required_after_hours, minimum_rest_between_shifts_hours,
  minimum_wage, ihss_ceiling, ihss_employee_rate, rap_rate,
  holidays, notes
)
SELECT
  'COL', 2026, true,
  7.00, 42.00, 6,
  7.00, 1.25, 1.75, 1.90,
  0, 0.00, 0.00,
  1750905, 0, 0, 0,
  $holidays$[{"date":"2026-01-01","name":"Año Nuevo","movable":false},{"date":"2026-01-12","name":"Día de los Reyes Magos","movable":true},{"date":"2026-03-23","name":"Día de San José","movable":true},{"date":"2026-04-02","name":"Jueves Santo","movable":true},{"date":"2026-04-03","name":"Viernes Santo","movable":true},{"date":"2026-05-01","name":"Día del Trabajo","movable":false},{"date":"2026-05-18","name":"Ascensión del Señor","movable":true},{"date":"2026-06-08","name":"Corpus Christi","movable":true},{"date":"2026-06-15","name":"Sagrado Corazón de Jesús","movable":true},{"date":"2026-06-29","name":"San Pedro y San Pablo","movable":true},{"date":"2026-07-20","name":"Día de la Independencia","movable":false},{"date":"2026-08-07","name":"Batalla de Boyacá","movable":false},{"date":"2026-08-17","name":"Asunción de la Virgen","movable":true},{"date":"2026-10-12","name":"Día de la Raza","movable":true},{"date":"2026-11-02","name":"Día de Todos los Santos","movable":true},{"date":"2026-11-16","name":"Independencia de Cartagena","movable":true},{"date":"2026-12-08","name":"Inmaculada Concepción","movable":false},{"date":"2026-12-25","name":"Navidad","movable":false}]$holidays$::jsonb,
  'Colombia 2026: festivos Ley Emiliani. Jornada 44 h hasta el 14-jul y 42 h desde el 15-jul (ver payroll_statutory_params). Columnas de horas extra y fiscales no las usa el motor de COL.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.labor_laws l WHERE l.country_code = 'COL' AND l.year = 2026
);

INSERT INTO public.payroll_statutory_params (country_code, year, is_active, statutory_config, source, notes)
SELECT
  'COL', 2026, false,
  $json${
    "schemaVersion": 1,
    "engine": "COL",
    "currency": "COP",
    "smmlv": [
      { "from": "2026-01-01", "to": "2026-12-31", "value": 1750905, "source": "Decreto 0159 de 2026 (transitorio; Decreto 1469 de 2025 suspendido)" }
    ],
    "transport_allowance": [
      { "from": "2026-01-01", "to": "2026-12-31", "value": 249095, "source": "Decreto 1470 de 2025" }
    ],
    "uvt": [
      { "from": "2026-01-01", "to": "2026-12-31", "value": 52374, "source": "DIAN Resolución 000238 de 2025" }
    ],
    "ordinary_hours": [
      { "from": "2026-01-01", "to": "2026-07-14", "weekly_hours": 44, "monthly_divisor": 220, "source": "Ley 2101 de 2021" },
      { "from": "2026-07-15", "to": "2026-12-31", "weekly_hours": 42, "monthly_divisor": 210, "source": "Ley 2101 de 2021" }
    ],
    "night_window": [
      { "from": "2026-01-01", "to": "2026-12-31", "start": "19:00", "end": "06:00", "source": "Ley 2466 de 2025 (confirmar fecha de inicio)" }
    ],
    "surcharges": [
      { "from": "2026-01-01", "to": "2026-06-30", "night": 0.35, "sunday_holiday": 0.80, "overtime_day": 0.25, "overtime_night": 0.75, "source": "CST art. 168; Ley 2466 de 2025" },
      { "from": "2026-07-01", "to": "2026-12-31", "night": 0.35, "sunday_holiday": 0.90, "overtime_day": 0.25, "overtime_night": 0.75, "source": "CST art. 168; Ley 2466 de 2025" }
    ],
    "disclaimer": "Pendiente de validación por contador colombiano. No activar sin esa revisión."
  }$json$::jsonb,
  'pending_review',
  'Fase 1: inactivo. Validar con contador colombiano antes de is_active = true y de PAYROLL_COUNTRY_COL_ENABLED.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.payroll_statutory_params p WHERE p.country_code = 'COL' AND p.year = 2026
);
