-- Add soft-delete column to companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON companies(deleted_at);

-- Super admin manage policies for key tables (complement existing policies)
-- Employees
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employees' AND policyname = 'Super admins can manage employees'
  ) THEN
    CREATE POLICY "Super admins can manage employees" ON employees
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid() AND up.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- Departments
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'departments' AND policyname = 'Super admins can manage departments'
  ) THEN
    CREATE POLICY "Super admins can manage departments" ON departments
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid() AND up.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- Work schedules
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'work_schedules' AND policyname = 'Super admins can manage work schedules'
  ) THEN
    CREATE POLICY "Super admins can manage work schedules" ON work_schedules
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid() AND up.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- Payroll records
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payroll_records' AND policyname = 'Super admins can manage payroll records'
  ) THEN
    CREATE POLICY "Super admins can manage payroll records" ON payroll_records
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid() AND up.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- Leave types
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leave_types' AND policyname = 'Super admins can manage leave types'
  ) THEN
    CREATE POLICY "Super admins can manage leave types" ON leave_types
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid() AND up.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- Leave requests
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leave_requests' AND policyname = 'Super admins can manage leave requests'
  ) THEN
    CREATE POLICY "Super admins can manage leave requests" ON leave_requests
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid() AND up.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- Audit logs (read)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'Super admins can view audit logs'
  ) THEN
    CREATE POLICY "Super admins can view audit logs" ON audit_logs
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid() AND up.role = 'super_admin'
        )
      );
  END IF;
END $$;


