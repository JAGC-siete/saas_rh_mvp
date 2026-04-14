-- leave_types: flags for employee self-service portal and Art. 95 CT Honduras (licencias con goce)
ALTER TABLE public.leave_types
  ADD COLUMN IF NOT EXISTS employee_self_service boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_statutory_art95 boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.leave_types.employee_self_service IS 'Si el empleado puede solicitar este tipo desde el portal (autogestión).';
COMMENT ON COLUMN public.leave_types.is_statutory_art95 IS 'Si aplica cupo Art. 95 CT HN (2 días/mes, 15/año) en validación de solicitudes.';

-- Backfill: equivaler al filtro previo por nombre en /api/employees/me/permission-types
UPDATE public.leave_types
SET employee_self_service = true
WHERE employee_self_service = false
  AND (
    lower(trim(name)) LIKE '%permiso%'
    OR lower(trim(name)) LIKE '%personal%'
    OR lower(trim(name)) LIKE '%emergencia%'
  );

-- Opcional: vacaciones autogestionables si el nombre coincide (empresas que lo permitan)
UPDATE public.leave_types
SET employee_self_service = true
WHERE employee_self_service = false
  AND (lower(trim(name)) ~ 'vacaci[oó]n' OR lower(trim(name)) LIKE '%vacation%');
