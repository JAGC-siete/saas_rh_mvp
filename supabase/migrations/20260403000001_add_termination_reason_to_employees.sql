-- Motivo de baja: columnas dedicadas para reportes / SQL / cumplimiento.
-- Ejecutable en Supabase SQL Editor o vía CLI migrations.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS termination_reason_code TEXT,
  ADD COLUMN IF NOT EXISTS termination_reason_detail TEXT;

COMMENT ON COLUMN public.employees.termination_reason_code IS
  'Código estable del motivo de terminación (ej. renuncia_voluntaria, despido_justificado). Requerido al pasar a inactive vía aplicación.';
COMMENT ON COLUMN public.employees.termination_reason_detail IS
  'Detalle libre opcional (aclaraciones, acuerdos, referencia a acta, etc.).';

-- Reportes y filtros por motivo en empleados inactivos.
CREATE INDEX IF NOT EXISTS idx_employees_inactive_termination_code
  ON public.employees (company_id, termination_reason_code)
  WHERE status = 'inactive' AND termination_reason_code IS NOT NULL;

-- Opcional: exigir motivo en BD cuando quede inactive (solo tras backfill de filas legacy).
-- Descomentar cuando todas las bajas existentes tengan código o se acepte NULL solo histórico:
-- ALTER TABLE public.employees
--   ADD CONSTRAINT employees_termination_reason_required_when_inactive
--   CHECK (status <> 'inactive' OR termination_reason_code IS NOT NULL);
