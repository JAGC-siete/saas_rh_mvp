-- Update any records from old table to new table if needed
-- This script runs after init.sql during container initialization

-- If you still have records in a control_asistencia table, migrate them
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'control_asistencia') THEN
        -- Check if attendance table exists
        IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'attendance') THEN
            -- Create attendance table if it doesn't exist
            EXECUTE '
                CREATE TABLE attendance (
                    id SERIAL PRIMARY KEY,
                    employee_id UUID REFERENCES employees(id),
                    date DATE NOT NULL,
                    check_in TIME,
                    check_out TIME,
                    reason TEXT,
                    CONSTRAINT unique_employee_date UNIQUE (employee_id, date)
                )
            ';
        END IF;

        -- Move data from control_asistencia to attendance
        EXECUTE '
            INSERT INTO attendance (employee_id, date, check_in, check_out, reason)
            SELECT e.id, ca.date, ca.check_in, ca.check_out, ca.justification
            FROM control_asistencia ca
            JOIN employees e ON RIGHT(e.dni, 5) = ca.last5
            ON CONFLICT (employee_id, date) DO NOTHING
        ';

        -- Drop old table
        EXECUTE 'DROP TABLE IF EXISTS control_asistencia';
    END IF;
END $$;
