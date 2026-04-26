-- Migration: Create attendance_hours_calculation table (Capa 3)
-- Date: 2026-02-11
-- Description: Detailed hours calculation with normal/overtime segmentation.
-- Honduras: overtime_diurno +25%, overtime_nocturno +50%, overtime_feriado +75%.

CREATE TABLE IF NOT EXISTS attendance_hours_calculation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_schedule_id UUID REFERENCES work_schedules(id),
  
  -- Cálculo de horas
  total_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  normal_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  -- Separar overtime por tipo (Honduras: 25%, 50%, 75%)
  overtime_diurno_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  overtime_nocturno_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  overtime_feriado_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  lunch_minutes INTEGER DEFAULT 0,
  
  -- Segmentación por períodos (para auditoría)
  time_segments JSONB DEFAULT '[]',
  
  -- Metadata del cálculo
  calculation_method TEXT DEFAULT 'automatic' CHECK (calculation_method IN ('automatic', 'manual', 'adjusted')),
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  calculated_by UUID REFERENCES employees(id),
  
  -- Referencia a ajustes manuales si aplica (sin FK para evitar dependencias circulares)
  adjustment_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(attendance_record_id)
);

CREATE INDEX IF NOT EXISTS idx_ahc_attendance_record 
  ON attendance_hours_calculation(attendance_record_id);
CREATE INDEX IF NOT EXISTS idx_ahc_employee 
  ON attendance_hours_calculation(employee_id);
CREATE INDEX IF NOT EXISTS idx_ahc_work_schedule 
  ON attendance_hours_calculation(work_schedule_id);

ALTER TABLE attendance_hours_calculation ENABLE ROW LEVEL SECURITY;

-- Policy: Users see calculations for their company's employees
CREATE POLICY ahc_select_by_company
  ON attendance_hours_calculation
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL
      )
    )
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Policy: Company admins and HR managers can manage
CREATE POLICY ahc_manage_by_admin
  ON attendance_hours_calculation
  FOR ALL
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees 
      WHERE company_id IN (
        SELECT company_id FROM user_profiles 
        WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager')
      )
    )
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE TRIGGER ahc_updated_at
  BEFORE UPDATE ON attendance_hours_calculation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE attendance_hours_calculation IS 'Capa 3: Detailed hours with overtime diurno/nocturno/feriado. Honduras: 25%, 50%, 75%.';
