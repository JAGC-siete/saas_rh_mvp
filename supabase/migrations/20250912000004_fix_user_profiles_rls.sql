-- Fix user_profiles RLS policies to allow user creation
-- Date: 2025-09-12

-- 1. Make company_id nullable temporarily
ALTER TABLE user_profiles ALTER COLUMN company_id DROP NOT NULL;

-- 2. Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Company admins can manage user profiles in their company" ON user_profiles;

-- 3. Create new policies that allow user creation
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Super admins can view all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can manage all profiles" ON user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.role = 'super_admin'
        )
    );

-- 4. Create function for user profile creation (can be called from API)
CREATE OR REPLACE FUNCTION public.create_user_profile(user_id UUID)
RETURNS void AS $$
BEGIN
  -- Create user profile without company_id initially
  INSERT INTO public.user_profiles (id, role, is_active, permissions, created_at, updated_at)
  VALUES (
    user_id,
    'super_admin',
    true,
    '{
      "can_manage_employees": true,
      "can_view_payroll": true,
      "can_manage_attendance": true,
      "can_manage_departments": true,
      "can_view_reports": true,
      "can_manage_companies": true,
      "can_generate_payroll": true,
      "can_export_payroll": true,
      "can_view_own_attendance": true,
      "can_register_attendance": true
    }'::jsonb,
    NOW(),
    NOW()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE WARNING 'Error creating user profile for user %: %', user_id, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile(UUID) TO authenticated;

-- 6. Add comments
COMMENT ON FUNCTION public.create_user_profile(UUID) IS 'Función para crear perfil de usuario desde API';
COMMENT ON POLICY "Users can insert their own profile" ON user_profiles IS 'Permite a los usuarios crear su propio perfil';
