-- Fix employee_invitations constraints to prevent duplicate pending invitations
-- This migration ensures only one pending invitation per email

-- Add unique constraint for pending invitations per email
-- This prevents multiple pending invitations for the same email
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_invitations_unique_pending_email 
ON employee_invitations (email) 
WHERE status = 'pending';

-- Add index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_employee_invitations_token_status 
ON employee_invitations (token, status, expires_at);

-- Clean up any existing duplicate pending invitations
-- Keep only the most recent one for each email
WITH duplicate_invitations AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY email 
      ORDER BY created_at DESC
    ) as rn
  FROM employee_invitations 
  WHERE status = 'pending'
)
UPDATE employee_invitations 
SET status = 'cancelled'
WHERE id IN (
  SELECT id 
  FROM duplicate_invitations 
  WHERE rn > 1
);

-- Log the cleanup
DO $$
DECLARE
  cancelled_count INTEGER;
BEGIN
  GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  RAISE NOTICE 'Cancelled % duplicate pending invitations', cancelled_count;
END $$;
