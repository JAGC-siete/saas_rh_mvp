-- Simple fix for user creation - make company_id nullable temporarily
-- Date: 2025-09-12

-- 1. Make company_id nullable in user_profiles temporarily
ALTER TABLE user_profiles ALTER COLUMN company_id DROP NOT NULL;

-- 2. Create a simpler user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create user profile without company_id initially
  INSERT INTO public.user_profiles (id, role, is_active, permissions, created_at, updated_at)
  VALUES (
    NEW.id,
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
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Add comments
COMMENT ON FUNCTION public.handle_new_user() IS 'Función simple para crear perfil automáticamente cuando se registra un nuevo usuario';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Trigger para crear perfil automáticamente';
