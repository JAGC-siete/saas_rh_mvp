-- Verify and update activaciones table structure for trial flow
-- Run this in Supabase SQL Editor

-- Check current table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'activaciones' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add acepta_trial column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activaciones' 
          AND column_name = 'acepta_trial'
    ) THEN
        ALTER TABLE public.activaciones ADD COLUMN acepta_trial BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added acepta_trial column';
    END IF;

    -- Add tenant_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activaciones' 
          AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.activaciones ADD COLUMN tenant_id TEXT;
        RAISE NOTICE 'Added tenant_id column';
    END IF;

    -- Add magic_link column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activaciones' 
          AND column_name = 'magic_link'
    ) THEN
        ALTER TABLE public.activaciones ADD COLUMN magic_link TEXT;
        RAISE NOTICE 'Added magic_link column';
    END IF;

    -- Add trial_expires_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activaciones' 
          AND column_name = 'trial_expires_at'
    ) THEN
        ALTER TABLE public.activaciones ADD COLUMN trial_expires_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added trial_expires_at column';
    END IF;
END $$;

-- Update status check constraint to include new trial statuses
ALTER TABLE public.activaciones 
DROP CONSTRAINT IF EXISTS activaciones_status_check;

ALTER TABLE public.activaciones 
ADD CONSTRAINT activaciones_status_check 
CHECK (
    status IN (
        'pending',
        'verified', 
        'active',
        'rejected',
        'trial_pending_data',
        'trial_live',
        'ready_for_conversion'
    )
);

-- Verify final table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'activaciones' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test insert to verify everything works
INSERT INTO public.activaciones (
    empleados,
    empresa,
    contacto_nombre,
    contacto_whatsapp,
    contacto_email,
    acepta_trial,
    tenant_id,
    magic_link,
    trial_expires_at,
    status,
    departamentos,
    monto,
    comprobante,
    notas
) VALUES (
    3,
    'Test Company',
    'Test User',
    '9999-9999',
    'test@example.com',
    true,
    'tnt_test_123',
    'https://example.com/test',
    NOW() + INTERVAL '7 days',
    'trial_pending_data',
    null,
    null,
    null,
    'Test insert for verification'
);

-- Verify the insert worked
SELECT 
    id,
    empresa,
    empleados,
    acepta_trial,
    tenant_id,
    status,
    created_at
FROM public.activaciones 
WHERE empresa = 'Test Company'
ORDER BY created_at DESC
LIMIT 1;

-- Clean up test data
DELETE FROM public.activaciones WHERE empresa = 'Test Company';

RAISE NOTICE 'Table structure verification completed successfully!';
