-- Migration: Enhance Leave System with Duration Support
-- Date: 2025-08-05
-- Description: Add duration fields and fix leave system structure

-- First, let's check what tables actually exist and their structure
DO $$
BEGIN
    -- Check if leave_types table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leave_types') THEN
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
        
        -- Create basic policies for leave_types
        CREATE POLICY "super_admin_can_access_all_leave_types" ON leave_types
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM user_profiles up
                    WHERE up.id = auth.uid() 
                    AND up.role = 'super_admin'
                )
            );
            
        CREATE POLICY "company_admins_hr_managers_can_manage_company_leave_types" ON leave_types
            FOR ALL USING (
                company_id IN (
                    SELECT company_id FROM user_profiles 
                    WHERE user_profiles.id = auth.uid()
                    AND role IN ('company_admin', 'hr_manager')
                )
            );
    END IF;
END $$;

-- Add duration fields to leave_requests if they don't exist
DO $$
BEGIN
    -- Add duration_hours field
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'duration_hours') THEN
        ALTER TABLE leave_requests ADD COLUMN duration_hours DECIMAL(5,2);
    END IF;
    
    -- Add duration_type field
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'duration_type') THEN
        ALTER TABLE leave_requests ADD COLUMN duration_type TEXT DEFAULT 'days' CHECK (duration_type IN ('hours', 'days'));
    END IF;
    
    -- Add is_half_day field for 8-hour permissions
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'leave_requests' AND column_name = 'is_half_day') THEN
        ALTER TABLE leave_requests ADD COLUMN is_half_day BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Insert sample leave types if table is empty
INSERT INTO leave_types (name, max_days_per_year, is_paid, requires_approval, color)
SELECT * FROM (VALUES
    ('Vacaciones', 15, true, true, '#3498db'),
    ('Enfermedad', 10, true, true, '#e74c3c'),
    ('Personal', 5, false, true, '#f39c12'),
    ('Maternidad', 84, true, true, '#9b59b6'),
    ('Paternidad', 10, true, true, '#1abc9c'),
    ('Emergencia', 3, false, false, '#e67e22'),
    ('Permiso 8 Horas', 12, false, true, '#34495e'),
    ('Permiso 4 Horas', 24, false, true, '#95a5a6'),
    ('Permiso 2 Horas', 48, false, true, '#7f8c8d')
) AS v(name, max_days_per_year, is_paid, requires_approval, color)
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE name = v.name);

-- Update existing leave_requests to have duration_type
UPDATE leave_requests 
SET duration_type = 'days' 
WHERE duration_type IS NULL;

-- Add comments to document the new fields
COMMENT ON COLUMN leave_requests.duration_hours IS 'Duration in hours (for short permissions)';
COMMENT ON COLUMN leave_requests.duration_type IS 'Type of duration: hours or days';
COMMENT ON COLUMN leave_requests.is_half_day IS 'Indicates if this is a half-day permission (4 hours)';

-- Create function to calculate duration based on type
CREATE OR REPLACE FUNCTION calculate_leave_duration(
    start_date DATE,
    end_date DATE,
    duration_type TEXT DEFAULT 'days'
) RETURNS DECIMAL AS $$
DECLARE
    days_diff INTEGER;
    hours_diff DECIMAL;
BEGIN
    IF duration_type = 'hours' THEN
        -- For hourly permissions, calculate hours between start and end
        hours_diff := EXTRACT(EPOCH FROM (end_date - start_date)) / 3600;
        RETURN GREATEST(hours_diff, 0);
    ELSE
        -- For daily permissions, calculate days
        days_diff := end_date - start_date;
        RETURN GREATEST(days_diff, 0);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Update the existing days_requested calculation
UPDATE leave_requests 
SET days_requested = CASE 
    WHEN duration_type = 'hours' THEN 
        CASE 
            WHEN is_half_day THEN 4
            ELSE COALESCE(duration_hours, 8)
        END / 8.0
    ELSE 
        days_requested
    END
WHERE duration_type = 'hours';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_duration_type ON leave_requests(duration_type);
CREATE INDEX IF NOT EXISTS idx_leave_requests_is_half_day ON leave_requests(is_half_day);
CREATE INDEX IF NOT EXISTS idx_leave_requests_duration_hours ON leave_requests(duration_hours);

-- Update table comment
COMMENT ON TABLE leave_requests IS 'Enhanced employee leave requests with flexible duration support (hours/days) and file attachments';
COMMENT ON TABLE leave_types IS 'Leave types with enhanced duration and approval settings';
