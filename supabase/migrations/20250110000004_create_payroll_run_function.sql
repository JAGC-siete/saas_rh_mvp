-- Create function to create or update payroll run
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
    v_run_id UUID;
    v_existing_run UUID;
BEGIN
    -- Check if a run already exists for this period and company
    SELECT id INTO v_existing_run
    FROM payroll_runs
    WHERE company_uuid = p_company_uuid
      AND year = p_year
      AND month = p_month
      AND quincena = p_quincena
      AND tipo = p_tipo;
    
    IF v_existing_run IS NOT NULL THEN
        -- Return existing run ID
        RETURN v_existing_run;
    ELSE
        -- Create new run
        INSERT INTO payroll_runs (
            company_uuid,
            year,
            month,
            quincena,
            tipo,
            status,
            created_by
        ) VALUES (
            p_company_uuid,
            p_year,
            p_month,
            p_quincena,
            p_tipo,
            'draft',
            p_user_id
        ) RETURNING id INTO v_run_id;
        
        RETURN v_run_id;
    END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_or_update_payroll_run TO authenticated;

-- Create function to get payroll run status
CREATE OR REPLACE FUNCTION get_payroll_run_status(
    p_run_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status TEXT;
BEGIN
    SELECT status INTO v_status
    FROM payroll_runs
    WHERE id = p_run_id;
    
    RETURN COALESCE(v_status, 'not_found');
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_payroll_run_status TO authenticated;
