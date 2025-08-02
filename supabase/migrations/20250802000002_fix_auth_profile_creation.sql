-- Migración para mejorar autenticación y creación de perfiles
-- Fecha: 2025-08-02

-- 1. Mejorar política RLS para user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON user_profiles;

-- Política para que usuarios puedan ver su propio perfil
CREATE POLICY "Users can view own profile"
ON user_profiles
FOR SELECT
USING (auth.uid() = id);

-- Política para que usuarios puedan insertar su propio perfil
CREATE POLICY "Users can insert own profile"
ON user_profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Política para que usuarios puedan actualizar su propio perfil
CREATE POLICY "Users can update own profile"
ON user_profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Política para super admins (pueden ver todos los perfiles)
CREATE POLICY "Super admins can view all profiles"
ON user_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.role = 'super_admin'
  )
);

-- Política para super admins (pueden actualizar todos los perfiles)
CREATE POLICY "Super admins can update all profiles"
ON user_profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.role = 'super_admin'
  )
);

-- 2. Mejorar políticas para employees (sin restricción de empresa para super admins)
DROP POLICY IF EXISTS "Users can view employees in their company" ON employees;
DROP POLICY IF EXISTS "Super admins can view all employees" ON employees;

-- Política para ver empleados de la misma empresa
CREATE POLICY "Users can view employees in their company"
ON employees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.company_id = employees.company_id
  )
);

-- Política para super admins (pueden ver todos los empleados)
CREATE POLICY "Super admins can view all employees"
ON employees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.role = 'super_admin'
  )
);

-- 3. Mejorar políticas para payroll_records
DROP POLICY IF EXISTS "Users can view payroll in their company" ON payroll_records;
DROP POLICY IF EXISTS "Super admins can view all payroll" ON payroll_records;

-- Política para ver nómina de la misma empresa
CREATE POLICY "Users can view payroll in their company"
ON payroll_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.company_id = (
      SELECT company_id FROM employees WHERE id = payroll_records.employee_id
    )
  )
);

-- Política para super admins (pueden ver toda la nómina)
CREATE POLICY "Super admins can view all payroll"
ON payroll_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = auth.uid() 
    AND up.role = 'super_admin'
  )
);

-- 4. Función para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger para crear perfil automáticamente cuando se crea un usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Verificar que RLS esté habilitado
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;

-- 7. Comentarios para documentación
COMMENT ON FUNCTION public.handle_new_user() IS 'Función para crear perfil automáticamente cuando se registra un nuevo usuario';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Trigger para crear perfil automáticamente'; 