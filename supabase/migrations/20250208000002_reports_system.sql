-- =====================================================
-- REPORTS SYSTEM
-- =====================================================
-- Migration: Create comprehensive reporting system
-- Date: 2025-02-08
-- Description: Functions for generating various types of reports
-- =====================================================

-- =====================================================
-- 1. ATTENDANCE REPORTS
-- =====================================================

-- Function: Get attendance report with filters
CREATE OR REPLACE FUNCTION reports_attendance(
    p_company_id UUID,
    p_from DATE,
    p_to DATE,
    p_employee_ids UUID[] DEFAULT NULL,
    p_department_ids UUID[] DEFAULT NULL,
    p_status_filter TEXT[] DEFAULT NULL
) RETURNS TABLE (
    employee_id UUID,
    employee_name TEXT,
    employee_code TEXT,
    dni TEXT,
    department_name TEXT,
    date DATE,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    expected_check_in TIME,
    expected_check_out TIME,
    status TEXT,
    late_minutes INTEGER,
    hours_worked DECIMAL(5,2),
    justification TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id as employee_id,
        e.name as employee_name,
        e.employee_code,
        e.dni,
        d.name as department_name,
        ar.date,
        ar.check_in,
        ar.check_out,
        COALESCE(ar.expected_check_in, ws.monday_start) as expected_check_in,
        COALESCE(ar.expected_check_out, ws.monday_end) as expected_check_out,
        ar.status,
        ar.late_minutes,
        CASE 
            WHEN ar.check_in IS NOT NULL AND ar.check_out IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (ar.check_out - ar.check_in)) / 3600.0
            ELSE 0
        END as hours_worked,
        ar.justification
    FROM employees e
    INNER JOIN attendance_records ar ON e.id = ar.employee_id
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN work_schedules ws ON e.work_schedule_id = ws.id
    WHERE e.company_id = p_company_id
        AND ar.date BETWEEN p_from AND p_to
        AND (p_employee_ids IS NULL OR e.id = ANY(p_employee_ids))
        AND (p_department_ids IS NULL OR e.department_id = ANY(p_department_ids) OR e.department_id IS NULL)
        AND (p_status_filter IS NULL OR ar.status = ANY(p_status_filter))
    ORDER BY e.name, ar.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get attendance summary/KPIs
CREATE OR REPLACE FUNCTION reports_attendance_summary(
    p_company_id UUID,
    p_from DATE,
    p_to DATE,
    p_employee_ids UUID[] DEFAULT NULL,
    p_department_ids UUID[] DEFAULT NULL
) RETURNS TABLE (
    total_records BIGINT,
    present_count BIGINT,
    absent_count BIGINT,
    late_count BIGINT,
    late_minutes_total INTEGER,
    total_hours_worked DECIMAL(10,2),
    attendance_rate DECIMAL(5,2),
    punctuality_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH records AS (
        SELECT 
            ar.status,
            ar.late_minutes,
            ar.check_in,
            ar.check_out,
            CASE WHEN ar.check_in IS NOT NULL AND ar.check_out IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (ar.check_out - ar.check_in)) / 3600.0
                ELSE 0 END as hours
        FROM employees e
        INNER JOIN attendance_records ar ON e.id = ar.employee_id
        WHERE e.company_id = p_company_id
            AND ar.date BETWEEN p_from AND p_to
            AND (p_employee_ids IS NULL OR e.id = ANY(p_employee_ids))
            AND (p_department_ids IS NULL OR e.department_id = ANY(p_department_ids) OR e.department_id IS NULL)
    )
    SELECT 
        COUNT(*)::BIGINT as total_records,
        COUNT(*) FILTER (WHERE status = 'present')::BIGINT as present_count,
        COUNT(*) FILTER (WHERE status = 'absent')::BIGINT as absent_count,
        COUNT(*) FILTER (WHERE late_minutes > 5)::BIGINT as late_count,
        COALESCE(SUM(late_minutes) FILTER (WHERE late_minutes > 5)::INTEGER, 0) as late_minutes_total,
        COALESCE(SUM(hours)::DECIMAL(10,2), 0) as total_hours_worked,
        CASE 
            WHEN COUNT(*) > 0 
            THEN (COUNT(*) FILTER (WHERE status = 'present') * 100.0 / COUNT(*))::DECIMAL(5,2)
            ELSE 0 
        END as attendance_rate,
        CASE 
            WHEN COUNT(*) FILTER (WHERE status = 'present') > 0 
            THEN ((COUNT(*) FILTER (WHERE status = 'present') - COUNT(*) FILTER (WHERE late_minutes > 5)) * 100.0 / COUNT(*) FILTER (WHERE status = 'present'))::DECIMAL(5,2)
            ELSE 0 
        END as punctuality_rate
    FROM records;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. PAYROLL REPORTS
-- =====================================================

-- Function: Get payroll report with filters
CREATE OR REPLACE FUNCTION reports_payroll(
    p_company_id UUID,
    p_from DATE,
    p_to DATE,
    p_employee_ids UUID[] DEFAULT NULL,
    p_department_ids UUID[] DEFAULT NULL,
    p_payroll_type TEXT DEFAULT 'all'
) RETURNS TABLE (
    employee_id UUID,
    employee_name TEXT,
    employee_code TEXT,
    dni TEXT,
    department_name TEXT,
    period_start DATE,
    period_end DATE,
    period_type TEXT,
    base_salary DECIMAL(10,2),
    overtime_hours DECIMAL(5,2),
    overtime_amount DECIMAL(10,2),
    bonuses DECIMAL(10,2),
    commissions DECIMAL(10,2),
    other_earnings DECIMAL(10,2),
    gross_salary DECIMAL(10,2),
    income_tax DECIMAL(10,2),
    social_security DECIMAL(10,2),
    professional_tax DECIMAL(10,2),
    other_deductions DECIMAL(10,2),
    total_deductions DECIMAL(10,2),
    net_salary DECIMAL(10,2),
    days_worked INTEGER,
    days_absent INTEGER,
    late_days INTEGER,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id as employee_id,
        e.name as employee_name,
        e.employee_code,
        e.dni,
        d.name as department_name,
        pr.period_start,
        pr.period_end,
        pr.period_type,
        pr.base_salary,
        pr.overtime_hours,
        pr.overtime_amount,
        pr.bonuses,
        pr.commissions,
        pr.other_earnings,
        pr.gross_salary,
        pr.income_tax,
        pr.social_security,
        pr.professional_tax,
        pr.other_deductions,
        pr.total_deductions,
        pr.net_salary,
        pr.days_worked,
        pr.days_absent,
        pr.late_days,
        pr.status
    FROM employees e
    INNER JOIN payroll_records pr ON e.id = pr.employee_id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE e.company_id = p_company_id
        AND pr.period_start BETWEEN p_from AND p_to
        AND (p_employee_ids IS NULL OR e.id = ANY(p_employee_ids))
        AND (p_department_ids IS NULL OR e.department_id = ANY(p_department_ids) OR e.department_id IS NULL)
        AND (
            p_payroll_type = 'all' 
            OR (p_payroll_type = 'regular' AND pr.overtime_hours = 0)
            OR (p_payroll_type = 'overtime' AND pr.overtime_hours > 0)
        )
    ORDER BY e.name, pr.period_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get payroll summary/KPIs
CREATE OR REPLACE FUNCTION reports_payroll_summary(
    p_company_id UUID,
    p_from DATE,
    p_to DATE,
    p_employee_ids UUID[] DEFAULT NULL,
    p_department_ids UUID[] DEFAULT NULL
) RETURNS TABLE (
    total_employees INTEGER,
    total_payroll_records INTEGER,
    total_gross_salary DECIMAL(12,2),
    total_deductions DECIMAL(12,2),
    total_net_salary DECIMAL(12,2),
    total_overtime_hours DECIMAL(10,2),
    total_overtime_amount DECIMAL(12,2),
    paid_count INTEGER,
    pending_count INTEGER,
    draft_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH payroll_stats AS (
        SELECT 
            COUNT(DISTINCT e.id)::INTEGER as total_employees,
            COUNT(pr.id)::INTEGER as total_payroll_records,
            COALESCE(SUM(pr.gross_salary), 0)::DECIMAL(12,2) as total_gross_salary,
            COALESCE(SUM(pr.total_deductions), 0)::DECIMAL(12,2) as total_deductions,
            COALESCE(SUM(pr.net_salary), 0)::DECIMAL(12,2) as total_net_salary,
            COALESCE(SUM(pr.overtime_hours), 0)::DECIMAL(10,2) as total_overtime_hours,
            COALESCE(SUM(pr.overtime_amount), 0)::DECIMAL(12,2) as total_overtime_amount,
            COUNT(*) FILTER (WHERE pr.status = 'paid')::INTEGER as paid_count,
            COUNT(*) FILTER (WHERE pr.status = 'approved')::INTEGER as pending_count,
            COUNT(*) FILTER (WHERE pr.status = 'draft')::INTEGER as draft_count
        FROM employees e
        INNER JOIN payroll_records pr ON e.id = pr.employee_id
        WHERE e.company_id = p_company_id
            AND pr.period_start BETWEEN p_from AND p_to
            AND (p_employee_ids IS NULL OR e.id = ANY(p_employee_ids))
            AND (p_department_ids IS NULL OR e.department_id = ANY(p_department_ids) OR e.department_id IS NULL)
    )
    SELECT * FROM payroll_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. EMPLOYEE REPORTS
-- =====================================================

-- Function: Get employee report with filters
CREATE OR REPLACE FUNCTION reports_employees(
    p_company_id UUID,
    p_status_filter TEXT DEFAULT 'all',
    p_department_ids UUID[] DEFAULT NULL
) RETURNS TABLE (
    employee_id UUID,
    employee_code TEXT,
    name TEXT,
    dni TEXT,
    email TEXT,
    phone TEXT,
    department_name TEXT,
    role TEXT,
    "position" TEXT,
    base_salary DECIMAL(10,2),
    hire_date DATE,
    termination_date DATE,
    status TEXT,
    years_tenure DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id as employee_id,
        e.employee_code,
        e.name,
        e.dni,
        e.email,
        e.phone,
        d.name as department_name,
        e.role,
        e."position",
        e.base_salary,
        e.hire_date,
        e.termination_date,
        e.status,
        CASE 
            WHEN e.hire_date IS NOT NULL 
            THEN EXTRACT(YEAR FROM AGE(COALESCE(e.termination_date, CURRENT_DATE), e.hire_date))::DECIMAL(5,2)
            ELSE 0 
        END as years_tenure
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE e.company_id = p_company_id
        AND (p_status_filter = 'all' OR e.status = p_status_filter)
        AND (p_department_ids IS NULL OR e.department_id = ANY(p_department_ids) OR e.department_id IS NULL)
    ORDER BY e.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get employee summary/KPIs
CREATE OR REPLACE FUNCTION reports_employees_summary(
    p_company_id UUID,
    p_department_ids UUID[] DEFAULT NULL
) RETURNS TABLE (
    total_employees INTEGER,
    active_employees INTEGER,
    inactive_employees INTEGER,
    terminated_employees INTEGER,
    new_this_month INTEGER,
    avg_years_tenure DECIMAL(5,2),
    total_departments INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH employee_stats AS (
        SELECT 
            COUNT(*)::INTEGER as total_employees,
            COUNT(*) FILTER (WHERE status = 'active')::INTEGER as active_employees,
            COUNT(*) FILTER (WHERE status = 'inactive')::INTEGER as inactive_employees,
            COUNT(*) FILTER (WHERE status = 'terminated')::INTEGER as terminated_employees,
            COUNT(*) FILTER (
                WHERE hire_date >= DATE_TRUNC('month', CURRENT_DATE)
            )::INTEGER as new_this_month,
            AVG(
                CASE 
                    WHEN hire_date IS NOT NULL 
                    THEN EXTRACT(YEAR FROM AGE(COALESCE(termination_date, CURRENT_DATE), hire_date))::DECIMAL(5,2)
                    ELSE 0 
                END
            )::DECIMAL(5,2) as avg_years_tenure,
            COUNT(DISTINCT department_id)::INTEGER as total_departments
        FROM employees
        WHERE company_id = p_company_id
            AND (p_department_ids IS NULL OR department_id = ANY(p_department_ids) OR department_id IS NULL)
    )
    SELECT * FROM employee_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. WORK CERTIFICATE GENERATION
-- =====================================================

-- Function: Get employee data for work certificate
CREATE OR REPLACE FUNCTION reports_work_certificate_data(
    p_company_id UUID,
    p_employee_id UUID,
    p_certificate_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    employee_name TEXT,
    dni TEXT,
    "position" TEXT,
    department_name TEXT,
    hire_date DATE,
    base_salary DECIMAL(10,2),
    company_name TEXT,
    years_tenure INTEGER,
    months_tenure INTEGER,
    certificate_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.name as employee_name,
        e.dni,
        COALESCE(e."position", e.role) as "position",
        d.name as department_name,
        e.hire_date,
        e.base_salary,
        c.name as company_name,
        EXTRACT(YEAR FROM AGE(p_certificate_date, e.hire_date))::INTEGER as years_tenure,
        EXTRACT(MONTH FROM AGE(p_certificate_date, e.hire_date))::INTEGER as months_tenure,
        p_certificate_date as certificate_date
    FROM employees e
    INNER JOIN companies c ON e.company_id = c.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE e.company_id = p_company_id
        AND e.id = p_employee_id
        AND e.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. SEVERANCE CALCULATION
-- =====================================================

-- Function: Calculate severance pay for employee
CREATE OR REPLACE FUNCTION reports_calculate_severance(
    p_company_id UUID,
    p_employee_id UUID,
    p_termination_date DATE
) RETURNS TABLE (
    employee_name TEXT,
    dni TEXT,
    hire_date DATE,
    termination_date DATE,
    years_tenure DECIMAL(5,2),
    average_salary DECIMAL(10,2),
    severance_amount DECIMAL(12,2),
    vacation_balance DECIMAL(10,2),
    total_settlement DECIMAL(12,2),
    calculation_breakdown JSONB
) AS $$
DECLARE
    v_years DECIMAL;
    v_months DECIMAL;
    v_months_total DECIMAL;
    v_avg_salary DECIMAL;
    v_severance DECIMAL;
    v_vacation DECIMAL;
    v_total DECIMAL;
    v_breakdown JSONB;
BEGIN
    -- Get employee data
    SELECT 
        EXTRACT(YEAR FROM AGE(p_termination_date, e.hire_date))::DECIMAL,
        EXTRACT(MONTH FROM AGE(p_termination_date, e.hire_date))::DECIMAL,
        AVG(COALESCE(pr.net_salary, pr.gross_salary, e.base_salary))::DECIMAL
    INTO v_years, v_months, v_avg_salary
    FROM employees e
    LEFT JOIN payroll_records pr ON e.id = pr.employee_id
        AND pr.period_start >= e.hire_date
        AND pr.period_end <= p_termination_date
    WHERE e.id = p_employee_id 
        AND e.company_id = p_company_id
    GROUP BY e.hire_date;

    -- Calculate total months of service
    v_months_total := COALESCE(v_years * 12, 0) + COALESCE(v_months, 0);

    -- Calculate severance (1 month per year or fraction thereof)
    v_severance := CEIL(v_months_total / 12.0) * COALESCE(v_avg_salary, 0);

    -- Calculate vacation balance (proportional)
    v_vacation := COALESCE(v_avg_salary / 12.0 * (v_months_total / 12.0) * 1.5, 0); -- 1.5 months per year

    -- Total settlement
    v_total := v_severance + v_vacation;

    -- Build breakdown
    v_breakdown := jsonb_build_object(
        'months_of_service', v_months_total,
        'average_salary', v_avg_salary,
        'severance_months', CEIL(v_months_total / 12.0),
        'severance_calculation', jsonb_build_object(
            'formula', 'CEIL(months_of_service / 12) * average_salary',
            'result', v_severance
        ),
        'vacation_calculation', jsonb_build_object(
            'formula', '(average_salary / 12) * (months_of_service / 12) * 1.5',
            'result', v_vacation
        )
    );

    RETURN QUERY
    SELECT 
        e.name as employee_name,
        e.dni,
        e.hire_date,
        p_termination_date as termination_date,
        v_years as years_tenure,
        v_avg_salary as average_salary,
        v_severance as severance_amount,
        v_vacation as vacation_balance,
        v_total as total_settlement,
        v_breakdown as calculation_breakdown
    FROM employees e
    WHERE e.id = p_employee_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION reports_attendance TO authenticated;
GRANT EXECUTE ON FUNCTION reports_attendance_summary TO authenticated;
GRANT EXECUTE ON FUNCTION reports_payroll TO authenticated;
GRANT EXECUTE ON FUNCTION reports_payroll_summary TO authenticated;
GRANT EXECUTE ON FUNCTION reports_employees TO authenticated;
GRANT EXECUTE ON FUNCTION reports_employees_summary TO authenticated;
GRANT EXECUTE ON FUNCTION reports_work_certificate_data TO authenticated;
GRANT EXECUTE ON FUNCTION reports_calculate_severance TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION reports_attendance IS 'Get detailed attendance report with filters';
COMMENT ON FUNCTION reports_attendance_summary IS 'Get attendance summary KPIs';
COMMENT ON FUNCTION reports_payroll IS 'Get detailed payroll report with filters';
COMMENT ON FUNCTION reports_payroll_summary IS 'Get payroll summary KPIs';
COMMENT ON FUNCTION reports_employees IS 'Get employee list report with filters';
COMMENT ON FUNCTION reports_employees_summary IS 'Get employee summary KPIs';
COMMENT ON FUNCTION reports_work_certificate_data IS 'Get employee data for work certificate';
COMMENT ON FUNCTION reports_calculate_severance IS 'Calculate severance pay for terminated employee';

