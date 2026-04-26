-- Migration: Seed labor_laws for Honduras 2026
-- Date: 2026-02-11
-- Description: Inserts legal default values for Honduras 2026.
-- Values: minimum_wage, ihss_ceiling - mantener hasta confirmación oficial.
-- Holidays: 11 días incluyendo Semana Morazánica 7-9 octubre.

INSERT INTO labor_laws (
  country_code,
  year,
  is_active,
  
  -- Jornada laboral
  legal_daily_hours,
  legal_weekly_hours,
  legal_weekly_days,
  
  -- Horas extraordinarias (Honduras: 25%, 50%, 75%)
  overtime_threshold_hours,
  overtime_diurno_rate,
  overtime_nocturno_rate,
  overtime_feriado_rate,
  
  -- Descansos
  mandatory_break_minutes,
  break_required_after_hours,
  minimum_rest_between_shifts_hours,
  
  -- Valores fiscales (pendiente confirmación oficial)
  minimum_wage,
  ihss_ceiling,
  ihss_employee_rate,
  rap_rate,
  
  -- Feriados 2026 Honduras
  holidays,
  notes
) VALUES (
  'HND',
  2026,
  true,
  
  -- Jornada
  8.00,
  44.00,
  6,
  
  -- Overtime
  8.00,
  1.25,  -- +25% diurna
  1.50,  -- +50% nocturna
  1.75,  -- +75% feriado/mixto
  
  -- Descansos
  30,
  5.00,
  10.00,
  
  -- Fiscales (mantener hasta confirmación oficial)
  11903.13,
  11903.13,
  0.05,
  0.015,
  
  -- Feriados 2026
  '[
    {"date": "2026-01-01", "name": "Año Nuevo", "movable": false},
    {"date": "2026-04-02", "name": "Jueves Santo", "movable": true},
    {"date": "2026-04-03", "name": "Viernes Santo", "movable": true},
    {"date": "2026-04-04", "name": "Sábado Santo", "movable": true},
    {"date": "2026-04-14", "name": "Día de las Américas", "movable": true},
    {"date": "2026-05-01", "name": "Día del Trabajo", "movable": false},
    {"date": "2026-09-15", "name": "Día de la Independencia", "movable": false},
    {"date": "2026-10-07", "name": "Semana Morazánica (día 1)", "movable": true},
    {"date": "2026-10-08", "name": "Semana Morazánica (día 2)", "movable": true},
    {"date": "2026-10-09", "name": "Semana Morazánica (día 3)", "movable": true},
    {"date": "2026-12-25", "name": "Navidad", "movable": false}
  ]'::jsonb,
  'Valores Honduras 2026. minimum_wage e ihss_ceiling pendientes de confirmación oficial.'
)
ON CONFLICT (country_code, year) DO UPDATE SET
  legal_daily_hours = EXCLUDED.legal_daily_hours,
  legal_weekly_hours = EXCLUDED.legal_weekly_hours,
  overtime_diurno_rate = EXCLUDED.overtime_diurno_rate,
  overtime_nocturno_rate = EXCLUDED.overtime_nocturno_rate,
  overtime_feriado_rate = EXCLUDED.overtime_feriado_rate,
  holidays = EXCLUDED.holidays,
  notes = EXCLUDED.notes,
  updated_at = NOW();
