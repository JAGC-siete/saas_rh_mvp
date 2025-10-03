-- Migration: Fix days_requested type to support decimal values for hourly permissions
-- Date: 2025-10-03
-- Description: Change days_requested from INTEGER to DECIMAL to support fractional days for hourly permissions

-- Change days_requested column type to support decimal values
ALTER TABLE leave_requests 
ALTER COLUMN days_requested TYPE DECIMAL(5,2);

-- Update existing data to ensure consistency
-- Convert any existing integer values to decimal format
UPDATE leave_requests 
SET days_requested = days_requested::DECIMAL(5,2) 
WHERE days_requested IS NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN leave_requests.days_requested IS 'Number of days requested as decimal to support hourly permissions (e.g., 0.5 = 4 hours, 1.0 = 1 day)';
