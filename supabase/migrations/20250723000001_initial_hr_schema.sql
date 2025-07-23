-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA PUBLIC REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Companies table (Multi-tenant support)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE,
    plan_type TEXT DEFAULT 'basic',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Departments table
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    manager_id UUID, -- Will reference employees.id
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Work schedules table
CREATE TABLE work_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    monday_start TIME,
    monday_end TIME,
    tuesday_start TIME,
    tuesday_end TIME,
    wednesday_start TIME,
    wednesday_end TIME,
    thursday_start TIME,
    thursday_end TIME,
    friday_start TIME,
    friday_end TIME,
    saturday_start TIME,
    saturday_end TIME,
    sunday_start TIME,
    sunday_end TIME,
    break_duration INTEGER DEFAULT 60, -- in minutes
    timezone TEXT DEFAULT 'America/Tegucigalpa',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;

-- Employees table (Enhanced from your existing schema)
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id),
    work_schedule_id UUID REFERENCES work_schedules(id),
    employee_code TEXT, -- Internal employee number
    dni TEXT NOT NULL, -- DNI/National ID
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT,
    position TEXT,
    base_salary DECIMAL(10,2) NOT NULL,
    hire_date DATE,
    termination_date DATE,
    status TEXT DEFAULT 'active', -- active, inactive, terminated
    -- Banking info
    bank_name TEXT,
    bank_account TEXT,
    -- Emergency contact
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    -- Address
    address JSONB,
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_dni_per_company UNIQUE(company_id, dni),
    CONSTRAINT unique_employee_code_per_company UNIQUE(company_id, employee_code)
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Add foreign key for department manager
ALTER TABLE departments ADD CONSTRAINT fk_department_manager 
    FOREIGN KEY (manager_id) REFERENCES employees(id);

-- Attendance control table (Enhanced)
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    expected_check_in TIME,
    expected_check_out TIME,
    late_minutes INTEGER DEFAULT 0,
    early_departure_minutes INTEGER DEFAULT 0,
    justification TEXT,
    status TEXT DEFAULT 'present', -- present, absent, late, partial
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_employee_date UNIQUE(employee_id, date)
);

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Leave types table
CREATE TABLE leave_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    max_days_per_year INTEGER,
    is_paid BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT TRUE,
    color TEXT DEFAULT '#3498db',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

-- Leave requests table
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID REFERENCES leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INTEGER NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Payroll table (Enhanced)
CREATE TABLE payroll_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type TEXT DEFAULT 'monthly', -- weekly, biweekly, monthly
    
    -- Earnings
    base_salary DECIMAL(10,2) NOT NULL,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    overtime_amount DECIMAL(10,2) DEFAULT 0,
    bonuses DECIMAL(10,2) DEFAULT 0,
    commissions DECIMAL(10,2) DEFAULT 0,
    other_earnings DECIMAL(10,2) DEFAULT 0,
    gross_salary DECIMAL(10,2) NOT NULL,
    
    -- Deductions
    income_tax DECIMAL(10,2) DEFAULT 0, -- ISR
    social_security DECIMAL(10,2) DEFAULT 0,
    professional_tax DECIMAL(10,2) DEFAULT 0, -- RAP
    other_deductions DECIMAL(10,2) DEFAULT 0,
    total_deductions DECIMAL(10,2) DEFAULT 0,
    
    -- Net
    net_salary DECIMAL(10,2) NOT NULL,
    
    -- Attendance summary
    days_worked INTEGER DEFAULT 0,
    days_absent INTEGER DEFAULT 0,
    late_days INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'draft', -- draft, approved, paid
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    
    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_employee_period UNIQUE(employee_id, period_start, period_end)
);

ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;

-- User profiles table (for Supabase Auth integration)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    role TEXT NOT NULL DEFAULT 'employee', -- super_admin, company_admin, hr_manager, manager, employee
    permissions JSONB DEFAULT '{}',
    last_login TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_employees_company_id ON employees(company_id);
CREATE INDEX idx_employees_department_id ON employees(department_id);
CREATE INDEX idx_employees_dni ON employees(dni);
CREATE INDEX idx_attendance_employee_date ON attendance_records(employee_id, date);
CREATE INDEX idx_attendance_date ON attendance_records(date);
CREATE INDEX idx_payroll_employee_period ON payroll_records(employee_id, period_start, period_end);
CREATE INDEX idx_user_profiles_company ON user_profiles(company_id);
CREATE INDEX idx_audit_logs_company_created ON audit_logs(company_id, created_at);

-- Functions for triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_schedules_updated_at BEFORE UPDATE ON work_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_records_updated_at BEFORE UPDATE ON payroll_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
