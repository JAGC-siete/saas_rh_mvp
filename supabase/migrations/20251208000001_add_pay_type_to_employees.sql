-- Migration: Add pay_type to employees table
-- Date: 2025-12-08
-- Description: Adds pay_type enum to distinguish between fixed (administrative) and hourly employees

-- Create enum type for pay_type
CREATE TYPE pay_type_enum AS ENUM ('fixed', 'hourly');

-- Add pay_type column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS pay_type pay_type_enum NOT NULL DEFAULT 'fixed';

-- Add comment explaining the field
COMMENT ON COLUMN public.employees.pay_type IS 'Tipo de pago: fixed (administrativo/permanente) usa horario fijo, hourly (por hora) usa eventos consecutivos';

-- Create index for filtering by pay_type
CREATE INDEX IF NOT EXISTS idx_employees_pay_type 
ON public.employees(pay_type) 
WHERE pay_type IS NOT NULL;

