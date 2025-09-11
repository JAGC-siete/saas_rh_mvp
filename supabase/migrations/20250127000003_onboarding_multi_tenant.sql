-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  company_id UUID REFERENCES companies(id),
  role TEXT DEFAULT 'company_admin' CHECK (role IN ('super_admin', 'company_admin', 'hr_manager', 'employee')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create companies table if not exists
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  plan_type TEXT DEFAULT 'trial' CHECK (plan_type IN ('trial', 'basic', 'premium', 'enterprise')),
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create departments table if not exists
CREATE TABLE IF NOT EXISTS departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create employees table if not exists
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  employee_code TEXT,
  position TEXT,
  base_salary DECIMAL(10,2) DEFAULT 0,
  hire_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for companies
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
CREATE POLICY "Users can view their own company" ON companies
  FOR SELECT USING (
    id IN (
      SELECT company_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own company" ON companies;
CREATE POLICY "Users can update their own company" ON companies
  FOR UPDATE USING (
    id IN (
      SELECT company_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

-- RLS Policies for departments
DROP POLICY IF EXISTS "Users can view departments from their company" ON departments;
CREATE POLICY "Users can view departments from their company" ON departments
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage departments from their company" ON departments;
CREATE POLICY "Users can manage departments from their company" ON departments
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

-- RLS Policies for employees
DROP POLICY IF EXISTS "Users can view employees from their company" ON employees;
CREATE POLICY "Users can view employees from their company" ON employees
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage employees from their company" ON employees;
CREATE POLICY "Users can manage employees from their company" ON employees
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

-- RLS Policies for user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- Create company for new user
  INSERT INTO companies (name, subdomain, plan_type)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Mi Empresa'),
    LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'company_name', 'mi-empresa'), ' ', '-')) || '-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'trial'
  )
  RETURNING id INTO new_company_id;

  -- Create user profile
  INSERT INTO user_profiles (id, email, full_name, company_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    new_company_id,
    'company_admin'
  );

  -- Create demo departments
  INSERT INTO departments (company_id, name, description)
  VALUES 
    (new_company_id, 'Ventas', 'Equipo de ventas y comercialización'),
    (new_company_id, 'Soporte', 'Atención al cliente y soporte técnico'),
    (new_company_id, 'Desarrollo', 'Equipo de desarrollo de software'),
    (new_company_id, 'Recursos Humanos', 'Gestión de personal y talento humano'),
    (new_company_id, 'Administración', 'Gestión administrativa y contable');

  -- Create demo employees
  INSERT INTO employees (company_id, department_id, name, email, employee_code, position, base_salary, hire_date)
  SELECT 
    new_company_id,
    d.id,
    emp.name,
    emp.email,
    emp.employee_code,
    emp.position,
    emp.base_salary,
    emp.hire_date
  FROM (
    VALUES 
      ('Juan Pérez', 'juan.perez@empresa.com', 'EMP001', 'Gerente de Ventas', 25000.00, '2024-01-15'),
      ('María González', 'maria.gonzalez@empresa.com', 'EMP002', 'Especialista en Soporte', 18000.00, '2024-02-01'),
      ('Carlos López', 'carlos.lopez@empresa.com', 'EMP003', 'Desarrollador Senior', 30000.00, '2024-01-20'),
      ('Ana Martínez', 'ana.martinez@empresa.com', 'EMP004', 'Especialista en RRHH', 22000.00, '2024-02-10'),
      ('Luis Rodríguez', 'luis.rodriguez@empresa.com', 'EMP005', 'Contador', 20000.00, '2024-01-25')
  ) AS emp(name, email, employee_code, position, base_salary, hire_date)
  CROSS JOIN (
    SELECT id FROM departments WHERE company_id = new_company_id ORDER BY name LIMIT 5
  ) AS d;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_company_id ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
