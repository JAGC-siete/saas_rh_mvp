-- Fix RLS policies to allow company_admin to access their own profile
-- Date: 2025-01-29
-- Issue: company_admin users can't query their own profile due to missing RLS policy

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

-- 2. Create updated policies that support all roles including company_admin
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Allow company_admins to view profiles in their company
CREATE POLICY "Company admins can view profiles in their company" ON user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('company_admin', 'super_admin', 'admin')
      AND up.company_id = user_profiles.company_id
    )
  );

-- 4. Allow company_admins to update profiles in their company
CREATE POLICY "Company admins can update profiles in their company" ON user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('company_admin', 'super_admin', 'admin')
      AND up.company_id = user_profiles.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.role IN ('company_admin', 'super_admin', 'admin')
      AND up.company_id = user_profiles.company_id
    )
  );

-- 5. Grant explicit permissions for authenticated users
GRANT SELECT ON user_profiles TO authenticated;
GRANT UPDATE ON user_profiles TO authenticated;

