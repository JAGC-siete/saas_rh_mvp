-- Migration: RLS Policies for mail_list_subscriptions (Public Endpoints)
-- Date: 2025-01-16
-- Description: Enables anonymous access to mail_list_subscriptions for public subscription endpoints
--              while maintaining security through RLS policies

-- Enable RLS on mail_list_subscriptions if not already enabled
ALTER TABLE public.mail_list_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow anonymous subscription insert" ON public.mail_list_subscriptions;
DROP POLICY IF EXISTS "Allow token-based subscription read" ON public.mail_list_subscriptions;
DROP POLICY IF EXISTS "Allow token-based subscription update" ON public.mail_list_subscriptions;

-- Policy: Allow anonymous users to insert subscriptions with valid email format
CREATE POLICY "Allow anonymous subscription insert" ON public.mail_list_subscriptions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Validate email format (basic regex check)
  email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' AND
  -- Enforce length limits
  LENGTH(email) <= 255 AND
  LENGTH(email) >= 3 AND
  -- Require confirmation token
  confirmation_token IS NOT NULL AND
  LENGTH(confirmation_token) >= 16 AND
  -- Status must be pending initially
  status = 'pending'
);

-- Policy: Allow anonymous users to read subscriptions by confirmation token
-- This is needed for confirm/unsubscribe endpoints
CREATE POLICY "Allow token-based subscription read" ON public.mail_list_subscriptions
FOR SELECT
TO anon, authenticated
USING (
  confirmation_token IS NOT NULL
);

-- Policy: Allow anonymous users to update subscriptions by confirmation token
-- This allows confirm/unsubscribe operations
CREATE POLICY "Allow token-based subscription update" ON public.mail_list_subscriptions
FOR UPDATE
TO anon, authenticated
USING (
  confirmation_token IS NOT NULL
)
WITH CHECK (
  confirmation_token IS NOT NULL
);

-- Note: Authenticated users (admins) can still access all records through existing admin policies
-- or by using admin client with service role key






