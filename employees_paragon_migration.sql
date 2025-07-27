-- MIGRATION SCRIPT FOR 'employees' TABLE
-- Adds new columns to match the structure of 'employees_paragon' data.
-- Run this script in the Supabase SQL Editor.

-- 1. Add national_id column for DNI
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS national_id TEXT;

COMMENT ON COLUMN public.employees.national_id IS 'Employee''s national identity number (DNI).';

-- 2. Add bank_name column
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS bank_name TEXT;

COMMENT ON COLUMN public.employees.bank_name IS 'Name of the bank for salary payments.';

-- 3. Add bank_account_number column
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS bank_account_number TEXT;

COMMENT ON COLUMN public.employees.bank_account_number IS 'Bank account number for salary payments.';

-- 4. Add termination_reason column
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS termination_reason TEXT;

COMMENT ON COLUMN public.employees.termination_reason IS 'Reason for the employee''s termination or end of contract.';

-- 5. Add notes column
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN public.employees.notes IS 'General notes or observations about the employee.';

-- Optional: Create a separate table for performance reviews
-- This is a better practice than adding many columns to the employees table.
CREATE TABLE IF NOT EXISTS public.performance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    review_date DATE NOT NULL,
    review_type TEXT, -- e.g., '4 week', '2 months', 'annual'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.performance_reviews IS 'Stores performance review records for employees.';
COMMENT ON COLUMN public.performance_reviews.employee_id IS 'Link to the employee being reviewed.';
