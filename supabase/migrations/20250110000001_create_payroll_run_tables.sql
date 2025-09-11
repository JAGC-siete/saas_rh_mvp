-- Create payroll_runs table
CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_uuid UUID REFERENCES companies(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    quincena INTEGER NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'CON',
    status TEXT DEFAULT 'draft',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_company_period_tipo UNIQUE(company_uuid, year, month, quincena, tipo)
);

-- Create payroll_run_lines table
CREATE TABLE IF NOT EXISTS payroll_run_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
    company_uuid UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Calculated values
    calc_hours DECIMAL(5,2) DEFAULT 0,
    calc_bruto DECIMAL(10,2) DEFAULT 0,
    calc_ihss DECIMAL(10,2) DEFAULT 0,
    calc_rap DECIMAL(10,2) DEFAULT 0,
    calc_isr DECIMAL(10,2) DEFAULT 0,
    calc_neto DECIMAL(10,2) DEFAULT 0,
    
    -- Effective values (after edits)
    eff_hours DECIMAL(5,2) DEFAULT 0,
    eff_bruto DECIMAL(10,2) DEFAULT 0,
    eff_ihss DECIMAL(10,2) DEFAULT 0,
    eff_rap DECIMAL(10,2) DEFAULT 0,
    eff_isr DECIMAL(10,2) DEFAULT 0,
    eff_neto DECIMAL(10,2) DEFAULT 0,
    
    -- Edit tracking
    edited BOOLEAN DEFAULT FALSE,
    edit_reason TEXT,
    edited_by UUID REFERENCES auth.users(id),
    edited_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_run_employee UNIQUE(run_id, employee_id)
);

-- Enable RLS
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_run_lines ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_payroll_runs_company ON payroll_runs(company_uuid);
CREATE INDEX idx_payroll_runs_period ON payroll_runs(company_uuid, year, month, quincena);
CREATE INDEX idx_payroll_run_lines_run ON payroll_run_lines(run_id);
CREATE INDEX idx_payroll_run_lines_employee ON payroll_run_lines(employee_id);
CREATE INDEX idx_payroll_run_lines_company ON payroll_run_lines(company_uuid);

-- Create RLS policies
CREATE POLICY "Users can view payroll runs for their company" ON payroll_runs
    FOR SELECT USING (
        company_uuid IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can view payroll run lines for their company" ON payroll_run_lines
    FOR SELECT USING (
        company_uuid IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert payroll runs for their company" ON payroll_runs
    FOR INSERT WITH CHECK (
        company_uuid IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert payroll run lines for their company" ON payroll_run_lines
    FOR INSERT WITH CHECK (
        company_uuid IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update payroll runs for their company" ON payroll_runs
    FOR UPDATE USING (
        company_uuid IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update payroll run lines for their company" ON payroll_run_lines
    FOR UPDATE USING (
        company_uuid IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );
