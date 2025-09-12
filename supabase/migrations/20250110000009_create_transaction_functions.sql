-- Create transaction functions for payroll operations
-- Ensures atomicity when creating payroll runs with lines

-- Function to create payroll run with lines in a single transaction
CREATE OR REPLACE FUNCTION create_payroll_with_lines(
  p_run_id UUID,
  p_company_uuid UUID,
  p_year INTEGER,
  p_month INTEGER,
  p_quincena INTEGER,
  p_tipo payroll_type,
  p_created_by UUID,
  p_payroll_lines JSONB
)
RETURNS VOID AS $$
DECLARE
  line_record JSONB;
BEGIN
  -- Start transaction (implicit in function)
  
  -- Insert payroll run
  INSERT INTO payroll_runs (
    id,
    company_uuid,
    year,
    month,
    quincena,
    tipo,
    status,
    created_by,
    version
  ) VALUES (
    p_run_id,
    p_company_uuid,
    p_year,
    p_month,
    p_quincena,
    p_tipo,
    'draft'::payroll_status,
    p_created_by,
    1
  );

  -- Insert payroll lines
  FOR line_record IN SELECT * FROM jsonb_array_elements(p_payroll_lines)
  LOOP
    INSERT INTO payroll_run_lines (
      run_id,
      company_uuid,
      employee_id,
      calc_hours,
      calc_bruto,
      calc_ihss,
      calc_rap,
      calc_isr,
      calc_neto,
      eff_hours,
      eff_bruto,
      eff_ihss,
      eff_rap,
      eff_isr,
      eff_neto,
      edited
    ) VALUES (
      (line_record->>'run_id')::UUID,
      (line_record->>'company_uuid')::UUID,
      (line_record->>'employee_id')::UUID,
      (line_record->>'calc_hours')::DECIMAL,
      (line_record->>'calc_bruto')::DECIMAL,
      (line_record->>'calc_ihss')::DECIMAL,
      (line_record->>'calc_rap')::DECIMAL,
      (line_record->>'calc_isr')::DECIMAL,
      (line_record->>'calc_neto')::DECIMAL,
      (line_record->>'eff_hours')::DECIMAL,
      (line_record->>'eff_bruto')::DECIMAL,
      (line_record->>'eff_ihss')::DECIMAL,
      (line_record->>'eff_rap')::DECIMAL,
      (line_record->>'eff_isr')::DECIMAL,
      (line_record->>'eff_neto')::DECIMAL,
      (line_record->>'edited')::BOOLEAN
    );
  END LOOP;
  
  -- Commit transaction (implicit)
  
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback transaction (implicit)
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Function to authorize payroll with audit trail
CREATE OR REPLACE FUNCTION authorize_payroll_run(
  p_run_id UUID,
  p_authorized_by UUID,
  p_if_match TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  new_etag TEXT,
  error_message TEXT
) AS $$
DECLARE
  current_etag TEXT;
  new_version INTEGER;
BEGIN
  -- Get current ETag
  SELECT get_payroll_etag(p_run_id) INTO current_etag;
  
  -- Validate ETag
  IF current_etag != p_if_match THEN
    RETURN QUERY SELECT false, current_etag, 'ETag mismatch'::TEXT;
    RETURN;
  END IF;
  
  -- Check if already authorized
  IF (SELECT status FROM payroll_runs WHERE id = p_run_id) != 'draft'::payroll_status 
     AND (SELECT status FROM payroll_runs WHERE id = p_run_id) != 'edited'::payroll_status THEN
    RETURN QUERY SELECT false, current_etag, 'Invalid status transition'::TEXT;
    RETURN;
  END IF;
  
  -- Update status and version
  UPDATE payroll_runs 
  SET 
    status = 'authorized'::payroll_status,
    authorized_by = p_authorized_by,
    authorized_at = now(),
    updated_by = p_authorized_by
  WHERE id = p_run_id;
  
  -- Get new ETag
  SELECT get_payroll_etag(p_run_id) INTO current_etag;
  
  RETURN QUERY SELECT true, current_etag, NULL::TEXT;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, NULL::TEXT, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_payroll_with_lines TO authenticated;
GRANT EXECUTE ON FUNCTION authorize_payroll_run TO authenticated;

-- Add comments
COMMENT ON FUNCTION create_payroll_with_lines IS 'Creates payroll run and lines in a single atomic transaction';
COMMENT ON FUNCTION authorize_payroll_run IS 'Authorizes payroll run with ETag validation and audit trail';
