-- Migration: Add metadata column to attendance_records for device information
-- Date: 2025-12-09
-- Description: Adds metadata JSONB column to store Hikvision device information (doorNo, readerNo, verifyMode, cardNo, employeeNoString)

-- Add metadata column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'attendance_records'
      AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.attendance_records
    ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

    -- Create GIN index for efficient JSONB queries
    CREATE INDEX IF NOT EXISTS idx_attendance_records_metadata 
    ON public.attendance_records USING GIN (metadata);

    COMMENT ON COLUMN public.attendance_records.metadata IS 'Metadata JSONB field to store device-specific information from Hikvision events (doorNo, readerNo, verifyMode, cardNo, employeeNoString)';
  END IF;
END
$$;



