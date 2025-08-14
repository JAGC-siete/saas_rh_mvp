-- SQL Script to update activaciones table structure for new UI format
-- This script updates the departamentos column to match the new format: {total: number}
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/[your-project-id]/sql/new

-- Step 1: Add a comment to document the change in departamentos column format
COMMENT ON COLUMN public.activaciones.departamentos IS 'JSONB object with department count: {total: number} - Updated for new UI format';

-- Step 2: Update existing records to convert old array format to new object format
-- This handles any existing records that might have the old array format
UPDATE public.activaciones 
SET departamentos = CASE 
    WHEN departamentos IS NULL THEN '{"total": 1}'::jsonb
    WHEN jsonb_typeof(departamentos) = 'array' THEN 
        jsonb_build_object('total', COALESCE(jsonb_array_length(departamentos), 1))
    WHEN jsonb_typeof(departamentos) = 'object' AND departamentos ? 'total' THEN 
        departamentos  -- Already in correct format
    ELSE 
        '{"total": 1}'::jsonb  -- Default fallback
END
WHERE departamentos IS NULL 
   OR jsonb_typeof(departamentos) = 'array' 
   OR (jsonb_typeof(departamentos) = 'object' AND NOT (departamentos ? 'total'));

-- Step 3: Update the default value for new records
ALTER TABLE public.activaciones 
ALTER COLUMN departamentos SET DEFAULT '{"total": 1}'::jsonb;

-- Step 4: Add a check constraint to ensure departamentos follows the new format
-- First, drop any existing constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'activaciones_departamentos_format_check' 
        AND table_name = 'activaciones'
    ) THEN
        ALTER TABLE public.activaciones DROP CONSTRAINT activaciones_departamentos_format_check;
    END IF;
END $$;

-- Add the new constraint
ALTER TABLE public.activaciones 
ADD CONSTRAINT activaciones_departamentos_format_check 
CHECK (
    departamentos IS NULL OR 
    (
        jsonb_typeof(departamentos) = 'object' AND 
        departamentos ? 'total' AND 
        jsonb_typeof(departamentos->'total') = 'number' AND
        (departamentos->'total')::int > 0
    )
);

-- Step 5: Update the monto calculation comment to reflect L300 per employee
COMMENT ON COLUMN public.activaciones.monto IS 'Total amount to pay (employees * 300 lempiras)';

-- Step 6: Verify the changes by showing some sample data
-- Uncomment the following lines to see the results after running the update
-- SELECT 
--     id,
--     empresa,
--     empleados,
--     departamentos,
--     monto,
--     created_at
-- FROM public.activaciones 
-- ORDER BY created_at DESC 
-- LIMIT 5;

-- Step 7: Show table structure to confirm changes
-- Uncomment to see the updated table structure
-- SELECT 
--     column_name,
--     data_type,
--     column_default,
--     is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'activaciones' 
--   AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- Migration completed successfully!
-- The activaciones table now supports the new UI format:
-- - departamentos: {total: number} instead of array of strings
-- - monto calculation based on L300 per employee
-- - Proper validation constraints in place
-- - Existing data migrated to new format
