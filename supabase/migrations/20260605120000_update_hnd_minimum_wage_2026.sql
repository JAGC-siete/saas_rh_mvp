-- Migration: Actualizar salario mínimo promedio Honduras 2026
-- Source: Acuerdo Ejecutivo SETRASS No. 233-2026 (La Gaceta, 29-abr-2026)
--         Comunicado SAR-19-2026 — salario mínimo promedio L. 14,917.20
-- ihss_ceiling: sin nuevo techo IHSS publicado para 2026 (Ley 48-2024 fijó 2025 en L. 11,903.13)

UPDATE public.tax_brackets
SET
  minimum_wage = 14917.20,
  ihss_ceiling = 11903.13,
  source = 'official',
  notes = 'Salario mínimo promedio 2026 (SETRASS-233-2026 / SAR-19-2026). Techo IHSS sin ajuste oficial 2026.',
  updated_at = NOW()
WHERE country_code = 'HND' AND year = 2026;

UPDATE public.labor_laws
SET
  minimum_wage = 14917.20,
  ihss_ceiling = 11903.13,
  notes = 'Salario mínimo promedio 2026 (SETRASS-233-2026). Techo IHSS L. 11,903.13 hasta resolución Junta Directiva IHSS.',
  updated_at = NOW()
WHERE country_code = 'HND' AND year = 2026;

UPDATE public.payroll_statutory_params
SET
  statutory_config = jsonb_set(
    jsonb_set(
      statutory_config,
      '{minimum_wage}',
      '14917.20'::jsonb
    ),
    '{ihss_ceiling}',
    '11903.13'::jsonb
  ),
  source = 'official',
  notes = 'Salario mínimo promedio 2026 (SETRASS-233-2026 / SAR-19-2026). Techo IHSS sin ajuste oficial 2026.',
  updated_at = NOW()
WHERE country_code = 'HND' AND year = 2026;
