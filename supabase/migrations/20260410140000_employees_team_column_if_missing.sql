-- Asegura columna team en employees (índice idx_emp_team y SELECT del PDF de nómina la requieren).
-- Idempotente: entornos que ya la tienen no cambian.
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS team TEXT;
