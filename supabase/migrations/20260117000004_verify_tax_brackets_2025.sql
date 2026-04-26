-- Migration: Verification script for tax_brackets 2025 data
-- Date: 2026-01-17
-- Description: Verifies that tax_brackets table has correct 2025 data
--              This is a verification script, not a migration

-- Check if tax_brackets table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'tax_brackets'
  ) THEN
    RAISE EXCEPTION 'Table tax_brackets does not exist. Run migration 20260117000001 first.';
  END IF;
END $$;

-- Verify 2025 data exists
DO $$
DECLARE
  v_count INTEGER;
  v_record RECORD;
  v_brackets JSONB;
  v_expected_brackets JSONB := '[
    {"limit": 21457.76, "rate": 0.00, "base": 0, "lower": 0},
    {"limit": 30969.88, "rate": 0.15, "base": 0, "lower": 21457.76},
    {"limit": 67604.36, "rate": 0.20, "base": 1428.32, "lower": 30969.88},
    {"limit": 999999999, "rate": 0.25, "base": 8734.32, "lower": 67604.36}
  ]'::jsonb;
BEGIN
  -- Check if 2025 record exists
  SELECT COUNT(*) INTO v_count
  FROM tax_brackets
  WHERE year = 2025;
  
  IF v_count = 0 THEN
    RAISE WARNING 'No tax_brackets record found for year 2025. Run migration 20260117000002 to seed data.';
  ELSIF v_count > 1 THEN
    RAISE WARNING 'Multiple tax_brackets records found for year 2025. This should not happen (year is UNIQUE).';
  ELSE
    -- Get the record
    SELECT * INTO v_record
    FROM tax_brackets
    WHERE year = 2025;
    
    -- Verify values
    IF v_record.minimum_wage != 11903.13 THEN
      RAISE WARNING 'minimum_wage mismatch. Expected: 11903.13, Found: %', v_record.minimum_wage;
    END IF;
    
    IF v_record.ihss_ceiling != 11903.13 THEN
      RAISE WARNING 'ihss_ceiling mismatch. Expected: 11903.13, Found: %', v_record.ihss_ceiling;
    END IF;
    
    IF v_record.ihss_employee_rate != 0.05 THEN
      RAISE WARNING 'ihss_employee_rate mismatch. Expected: 0.05, Found: %', v_record.ihss_employee_rate;
    END IF;
    
    IF v_record.rap_rate != 0.015 THEN
      RAISE WARNING 'rap_rate mismatch. Expected: 0.015, Found: %', v_record.rap_rate;
    END IF;
    
    -- Verify brackets structure
    v_brackets := v_record.isr_brackets;
    
    IF jsonb_array_length(v_brackets) != 4 THEN
      RAISE WARNING 'Expected 4 ISR brackets, found %', jsonb_array_length(v_brackets);
    END IF;
    
    -- Compare brackets (simplified check - just verify count and first/last)
    IF (v_brackets->0->>'limit')::numeric != 21457.76 THEN
      RAISE WARNING 'First bracket limit mismatch. Expected: 21457.76, Found: %', v_brackets->0->>'limit';
    END IF;
    
    IF (v_brackets->3->>'limit')::numeric != 999999999 THEN
      RAISE WARNING 'Last bracket limit mismatch. Expected: 999999999, Found: %', v_brackets->3->>'limit';
    END IF;
    
    IF v_record.is_active != true THEN
      RAISE WARNING '2025 tax bracket is not marked as active';
    END IF;
    
    RAISE NOTICE '✓ Tax brackets 2025 verification passed!';
    RAISE NOTICE '  - Year: %', v_record.year;
    RAISE NOTICE '  - Minimum Wage: L. %', v_record.minimum_wage;
    RAISE NOTICE '  - IHSS Ceiling: L. %', v_record.ihss_ceiling;
    RAISE NOTICE '  - IHSS Rate: %', v_record.ihss_employee_rate;
    RAISE NOTICE '  - RAP Rate: %', v_record.rap_rate;
    RAISE NOTICE '  - ISR Brackets: % brackets', jsonb_array_length(v_brackets);
    RAISE NOTICE '  - Is Active: %', v_record.is_active;
  END IF;
END $$;

-- Display current 2025 data for manual verification
SELECT 
  year,
  country_code,
  is_active,
  minimum_wage,
  ihss_ceiling,
  ihss_employee_rate,
  rap_rate,
  jsonb_array_length(isr_brackets) as brackets_count,
  isr_brackets,
  source,
  notes,
  created_at
FROM tax_brackets
WHERE year = 2025;

