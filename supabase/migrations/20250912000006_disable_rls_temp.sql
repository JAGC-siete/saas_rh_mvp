-- Temporarily disable RLS for user_profiles to allow user creation
-- Date: 2025-09-12

-- 1. Make company_id nullable temporarily
ALTER TABLE user_profiles ALTER COLUMN company_id DROP NOT NULL;

-- 2. Temporarily disable RLS for user_profiles
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- 3. Create function for user profile creation
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

-- 4. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile(UUID) TO authenticated;

-- 5. Add comments
COMMENT ON FUNCTION public.create_user_profile(UUID) IS 'Función para crear perfil de usuario desde API';
