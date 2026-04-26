-- Migration: Add event_uid column to attendance_records for idempotency
-- Date: 2025-12-02
-- Description: Add unique event_uid to prevent duplicate attendance records from device retries

-- Add event_uid column (nullable for existing records, will be populated going forward)
ALTER TABLE public.attendance_records 
ADD COLUMN IF NOT EXISTS event_uid TEXT;

-- Create unique index on event_uid (allows NULLs but enforces uniqueness for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_records_event_uid 
ON public.attendance_records(event_uid) 
WHERE event_uid IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.attendance_records.event_uid IS 'SHA256 hash of device event for idempotency (macAddress|channelID|activePostCount|dateTime|employeeId)';

