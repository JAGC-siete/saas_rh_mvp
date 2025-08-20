-- Migration: Enhance Leave Schema for Business Requirements
-- Date: 2025-08-05
-- Description: Add DNI field and file attachments to leave_requests, ensure proper leave_type_id usage

-- Add DNI field to leave_requests table
ALTER TABLE leave_requests 
ADD COLUMN IF NOT EXISTS employee_dni VARCHAR(20);

-- Add file attachment fields to leave_requests table
ALTER TABLE leave_requests 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(10), -- 'pdf' or 'jpg'
ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255);

-- Add comment explaining the new fields
COMMENT ON COLUMN leave_requests.employee_dni IS 'Employee DNI for leave request identification';
COMMENT ON COLUMN leave_requests.attachment_url IS 'URL to uploaded attachment file';
COMMENT ON COLUMN leave_requests.attachment_type IS 'Type of attachment (pdf, jpg)';
COMMENT ON COLUMN leave_requests.attachment_name IS 'Original filename of attachment';

-- Create index on DNI for better performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_dni ON leave_requests(employee_dni);

-- Update existing leave_requests to use leave_type_id properly
-- This ensures compatibility with the existing schema
UPDATE leave_requests 
SET leave_type_id = (
    SELECT id FROM leave_types 
    WHERE name = leave_requests.leave_type 
    LIMIT 1
)
WHERE leave_type_id IS NULL AND leave_type IS NOT NULL;

-- Add constraint to ensure leave_type_id is not null for new records
ALTER TABLE leave_requests 
ALTER COLUMN leave_type_id SET NOT NULL;

-- Drop the old leave_type column if it exists (after migration)
-- ALTER TABLE leave_requests DROP COLUMN IF EXISTS leave_type;

-- Add comment to document the enhanced table
COMMENT ON TABLE leave_requests IS 'Enhanced employee leave requests with DNI identification and file attachments support';
