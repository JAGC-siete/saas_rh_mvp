-- Fix user creation by ensuring default company exists
-- Date: 2025-09-12

-- 1. Create a default company if it doesn't exist
INSERT INTO companies (id, name, subdomain, plan_type, is_active, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Company',
  'default',
  'basic',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Update the user creation function to handle missing companies better
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_company_id UUID;
BEGIN
  -- Get the default company ID
  SELECT id INTO default_company_id 
  FROM companies 
  WHERE id = '00000000-0000-0000-0000-000000000001'
  LIMIT 1;
  
  -- If still not found, create it
  IF default_company_id IS NULL THEN
    INSERT INTO companies (id, name, subdomain, plan_type, is_active, created_at, updated_at)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'Default Company',
      'default',
      'basic',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO default_company_id;
  END IF;

  -- Create user profile with company_id
  INSERT INTO public.user_profiles (id, company_id, role, is_active, permissions, created_at, updated_at)
  VALUES (
    NEW.id,
    default_company_id,
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
COMMENT ON FUNCTION public.handle_new_user() IS 'Función para crear perfil automáticamente cuando se registra un nuevo usuario';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Trigger para crear perfil automáticamente';
