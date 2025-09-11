-- Improve payroll authorization tracking and validation
-- Add authorization fields to payroll_runs table

-- Add authorization tracking fields
ALTER TABLE payroll_runs 
ADD COLUMN IF NOT EXISTS authorized_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS authorized_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS distribution_status TEXT DEFAULT 'pending' CHECK (distribution_status IN ('pending', 'in_progress', 'completed', 'failed'));

-- Add validation constraint for status transitions
ALTER TABLE payroll_runs 
ADD CONSTRAINT valid_status_transition CHECK (
  (status = 'draft' AND authorized_by IS NULL) OR
  (status = 'edited' AND authorized_by IS NULL) OR
  (status = 'authorized' AND authorized_by IS NOT NULL AND authorized_at IS NOT NULL) OR
  (status = 'distributed' AND authorized_by IS NOT NULL AND authorized_at IS NOT NULL)
);

-- Create function to authorize payroll run
CREATE OR REPLACE FUNCTION authorize_payroll_run(
    p_run_id UUID,
    p_authorized_by UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_run RECORD;
    v_lines_count INTEGER;
    v_result JSON;
BEGIN
    -- Get run details
    SELECT * INTO v_run
    FROM payroll_runs 
    WHERE id = p_run_id;
    
    -- Validate run exists
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Corrida de nómina no encontrada'
        );
    END IF;
    
    -- Validate run status
    IF v_run.status NOT IN ('draft', 'edited') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La corrida no está en estado autorizable',
            'current_status', v_run.status
        );
    END IF;
    
    -- Count lines
    SELECT COUNT(*) INTO v_lines_count
    FROM payroll_run_lines 
    WHERE run_id = p_run_id;
    
    -- Validate has lines
    IF v_lines_count = 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La corrida no tiene líneas de nómina'
        );
    END IF;
    
    -- Validate all lines have valid values
    IF EXISTS (
        SELECT 1 FROM payroll_run_lines 
        WHERE run_id = p_run_id 
        AND (eff_hours IS NULL OR eff_bruto IS NULL OR eff_neto IS NULL)
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Algunas líneas tienen valores inválidos'
        );
    END IF;
    
    -- Authorize the run
    UPDATE payroll_runs 
    SET 
        status = 'authorized',
        authorized_by = p_authorized_by,
        authorized_at = NOW(),
        updated_at = NOW()
    WHERE id = p_run_id;
    
    -- Return success with summary
    SELECT json_build_object(
        'success', true,
        'run_id', p_run_id,
        'status', 'authorized',
        'authorized_by', p_authorized_by,
        'authorized_at', NOW(),
        'lines_count', v_lines_count
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION authorize_payroll_run TO authenticated;

-- Create view for payroll run status with employee details
CREATE OR REPLACE VIEW v_payroll_runs_with_status AS
SELECT 
    pr.id,
    pr.company_uuid,
    pr.year,
    pr.month,
    pr.quincena,
    pr.tipo,
    pr.status,
    pr.created_by,
    pr.created_at,
    pr.updated_at,
    pr.authorized_by,
    pr.authorized_at,
    pr.distribution_status,
    COUNT(prl.id) as lines_count,
    COUNT(CASE WHEN prl.edited THEN 1 END) as edited_lines_count,
    SUM(prl.eff_bruto) as total_bruto,
    SUM(prl.eff_ihss + prl.eff_rap + prl.eff_isr) as total_deducciones,
    SUM(prl.eff_neto) as total_neto,
    -- Creator info
    up_creator.email as created_by_email,
    e_creator.name as created_by_name,
    -- Authorizer info
    up_authorizer.email as authorized_by_email,
    e_authorizer.name as authorized_by_name
FROM payroll_runs pr
LEFT JOIN payroll_run_lines prl ON pr.id = prl.run_id
LEFT JOIN user_profiles up_creator ON pr.created_by = up_creator.id
LEFT JOIN employees e_creator ON up_creator.employee_id = e_creator.id
LEFT JOIN user_profiles up_authorizer ON pr.authorized_by = up_authorizer.id
LEFT JOIN employees e_authorizer ON up_authorizer.employee_id = e_authorizer.id
GROUP BY pr.id, pr.company_uuid, pr.year, pr.month, pr.quincena, pr.tipo, 
         pr.status, pr.created_by, pr.created_at, pr.updated_at, 
         pr.authorized_by, pr.authorized_at, pr.distribution_status,
         up_creator.email, e_creator.name, up_authorizer.email, e_authorizer.name;

-- Grant select permission on view
GRANT SELECT ON v_payroll_runs_with_status TO authenticated;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_payroll_runs_authorized_by ON payroll_runs(authorized_by);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_authorized_at ON payroll_runs(authorized_at);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);

-- Add comment
COMMENT ON FUNCTION authorize_payroll_run IS 'Authorizes a payroll run after validation checks';
COMMENT ON VIEW v_payroll_runs_with_status IS 'Payroll runs with aggregated status and creator/authorizer information';
