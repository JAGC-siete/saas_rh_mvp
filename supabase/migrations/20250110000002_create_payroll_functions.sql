-- Create function to insert payroll line
CREATE OR REPLACE FUNCTION insert_payroll_line(
    p_run_id UUID,
    p_company_uuid UUID,
    p_employee_id UUID,
    p_calc_hours DECIMAL(5,2),
    p_calc_bruto DECIMAL(10,2),
    p_calc_ihss DECIMAL(10,2),
    p_calc_rap DECIMAL(10,2),
    p_calc_isr DECIMAL(10,2),
    p_calc_neto DECIMAL(10,2)
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    line_id UUID;
BEGIN
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
        eff_neto
    ) VALUES (
        p_run_id,
        p_company_uuid,
        p_employee_id,
        p_calc_hours,
        p_calc_bruto,
        p_calc_ihss,
        p_calc_rap,
        p_calc_isr,
        p_calc_neto,
        p_calc_hours,
        p_calc_bruto,
        p_calc_ihss,
        p_calc_rap,
        p_calc_isr,
        p_calc_neto
    ) RETURNING id INTO line_id;
    
    RETURN line_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION insert_payroll_line TO authenticated;
