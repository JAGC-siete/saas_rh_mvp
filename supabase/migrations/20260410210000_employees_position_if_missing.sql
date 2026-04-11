-- employees.position: esquema estándar y varios endpoints (voucher, listados, recibos legacy).
-- Los PDFs consolidados desde run usan role como puesto si position está vacío.
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS position TEXT;
