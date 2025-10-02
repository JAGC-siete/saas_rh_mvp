-- Fix attendance_lists_filtered function to use correct team field
-- Date: 2025-01-27
-- Description: Fix team field mapping in attendance_lists_filtered RPC

-- Drop existing function
DROP FUNCTION IF EXISTS attendance_lists_filtered(UUID, TEXT, TEXT, TEXT, TEXT, UUID);

-- Recreate function with correct team field
CREATE OR REPLACE FUNCTION attendance_lists_filtered(
  p_employee_id UUID DEFAULT NULL,
  p_from TEXT DEFAULT NULL,
  p_to TEXT DEFAULT NULL,
  p_type TEXT DEFAULT 'absent',
  p_role TEXT DEFAULT NULL,
  p_company_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  dni TEXT,
  employee_code TEXT,
  role TEXT,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  late_minutes INTEGER,
  status TEXT,
  date TEXT,
  team TEXT
)
AS $$
DECLARE
  v_from DATE;
  v_to DATE;
BEGIN
  -- Si no se especifica fecha, usar hoy
  IF p_from IS NULL THEN v_from := CURRENT_DATE; ELSE v_from := p_from::DATE; END IF;
  IF p_to IS NULL THEN v_to := CURRENT_DATE; ELSE v_to := p_to::DATE; END IF;

  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.dni,
    e.employee_code,
    e.role,
    ar.check_in,
    ar.check_out,
    ar.late_minutes,
    ar.status,
    ar.date::TEXT as date,
    e.team  -- ✅ FIX: Use actual team field instead of role as team
  FROM employees e
  LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
    AND ar.date BETWEEN v_from AND v_to
  WHERE e.status = 'active'
    AND e.company_id = COALESCE(p_company_id, e.company_id)
    AND (p_employee_id IS NULL OR e.id = p_employee_id)
    AND (p_role IS NULL OR e.role = p_role)
    AND (
      CASE p_type
        WHEN 'absent' THEN ar.id IS NULL
        WHEN 'present' THEN ar.check_in IS NOT NULL
        WHEN 'late' THEN ar.late_minutes > 0
        WHEN 'early' THEN ar.late_minutes < 0
        ELSE true
      END
    )
  ORDER BY e.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION attendance_lists_filtered(UUID, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION attendance_lists_filtered IS 'Lista empleados filtrados por tipo de asistencia con team field corregido';
