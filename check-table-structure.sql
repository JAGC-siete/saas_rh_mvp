-- Check current table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'activaciones' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if specific columns exist
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activaciones' 
          AND column_name = 'acepta_trial'
    ) THEN '✅ acepta_trial exists' ELSE '❌ acepta_trial missing' END as status;

SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activaciones' 
          AND column_name = 'tenant_id'
    ) THEN '✅ tenant_id exists' ELSE '❌ tenant_id missing' END as status;

SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activaciones' 
          AND column_name = 'magic_link'
    ) THEN '✅ magic_link exists' ELSE '❌ magic_link missing' END as status;

SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activaciones' 
          AND column_name = 'trial_expires_at'
    ) THEN '✅ trial_expires_at exists' ELSE '❌ trial_expires_at missing' END as status;
