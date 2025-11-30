-- Migration to create the missing get_user_company function and secure its permissions.
-- This approach is safer than dropping and recreating policies.
-- Date: 2025-11-25

-- Step 1: Create the secure function.
-- The SECURITY DEFINER clause allows this function to be executed with the permissions of the user who created it (the superuser),
-- bypassing the RLS of the user calling it. This is necessary to fetch the company_id from user_profiles.
CREATE OR REPLACE FUNCTION public.get_user_company()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT up.company_id
  FROM public.user_profiles up
  WHERE up.id = auth.uid()
  LIMIT 1
$$;

-- Step 2: Set secure permissions for the function.
-- REVOKE ALL removes any default permissions that might have been granted to the PUBLIC role.
-- GRANT EXECUTE specifically allows authenticated users to call this function, but no one else.
REVOKE ALL ON FUNCTION public.get_user_company() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_company() TO authenticated;


COMMENT ON FUNCTION public.get_user_company() IS 'Securely retrieves the company_id for the currently authenticated user. To be used in RLS policies.';

-- This migration intentionally leaves the existing RLS policies untouched.
-- By creating the missing function, the policies that depend on it will now execute correctly
-- without the "permission denied for function" error.
