-- Create payroll runs table to track payroll generation runs
CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    quincena INTEGER NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'CON', -- CON or SIN deductions
    status TEXT DEFAULT 'draft', -- draft, authorized, distributed
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_company_period_tipo UNIQUE(company_id, year, month, quincena, tipo)
);

-- Enable RLS
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policy for payroll_runs
CREATE POLICY "Users can view payroll runs for their company" ON payroll_runs
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert payroll runs for their company" ON payroll_runs
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update payroll runs for their company" ON payroll_runs
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Function to create or update payroll run
CREATE OR REPLACE FUNCTION create_or_update_payroll_run(
    p_company_uuid UUID,
    p_year INTEGER,
    p_month INTEGER,
    p_quincena INTEGER,
    p_tipo TEXT,
    p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    run_id UUID;
BEGIN
    -- Try to find existing run
    SELECT id INTO run_id
    FROM payroll_runs
    WHERE company_id = p_company_uuid
      AND year = p_year
      AND month = p_month
      AND quincena = p_quincena
      AND tipo = p_tipo;
    
    -- If not found, create new one
    IF run_id IS NULL THEN
        INSERT INTO payroll_runs (
            company_id,
            year,
            month,
            quincena,
            tipo,
            created_by
        ) VALUES (
            p_company_uuid,
            p_year,
            p_month,
            p_quincena,
            p_tipo,
            p_user_id
        ) RETURNING id INTO run_id;
    ELSE
        -- Update existing run
        UPDATE payroll_runs
        SET updated_at = NOW()
        WHERE id = run_id;
    END IF;
    
    RETURN run_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_or_update_payroll_run TO authenticated;
