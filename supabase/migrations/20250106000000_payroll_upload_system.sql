-- Migration: Payroll Upload System for Trial to Real Conversion
-- This migration creates the necessary tables and functions for handling payroll uploads

-- Table to store uploaded payroll files
CREATE TABLE public.payroll_uploads (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    tenant_id text NOT NULL,
    file_name text NOT NULL,
    file_type text NOT NULL CHECK (file_type IN ('excel', 'pdf')),
    file_size_bytes integer NOT NULL,
    file_url text NOT NULL,
    upload_status text DEFAULT 'uploaded' CHECK (upload_status IN ('uploaded', 'processing', 'processed', 'failed', 'converted')),
    processing_started_at timestamp with time zone,
    processing_completed_at timestamp with time zone,
    error_message text,
    extracted_data jsonb,
    conversion_status text DEFAULT 'pending' CHECK (conversion_status IN ('pending', 'in_progress', 'completed', 'failed')),
    converted_company_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payroll_uploads_pkey PRIMARY KEY (id),
    CONSTRAINT payroll_uploads_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
    CONSTRAINT payroll_uploads_converted_company_id_fkey FOREIGN KEY (converted_company_id) REFERENCES public.companies(id)
);

-- Table to store extracted employee data from payroll files
CREATE TABLE public.payroll_extracted_employees (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    upload_id uuid NOT NULL,
    row_number integer NOT NULL,
    extracted_name text,
    extracted_dni text,
    extracted_salary numeric,
    extracted_position text,
    extracted_department text,
    confidence_score numeric DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    validation_status text DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'rejected', 'manual_review')),
    processed_employee_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payroll_extracted_employees_pkey PRIMARY KEY (id),
    CONSTRAINT payroll_extracted_employees_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES public.payroll_uploads(id) ON DELETE CASCADE,
    CONSTRAINT payroll_extracted_employees_processed_employee_id_fkey FOREIGN KEY (processed_employee_id) REFERENCES public.employees(id)
);

-- Table to track conversion process
CREATE TABLE public.trial_conversions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id text NOT NULL,
    original_company_id uuid NOT NULL,
    converted_company_id uuid,
    upload_id uuid NOT NULL,
    conversion_type text DEFAULT 'payroll_upload' CHECK (conversion_type IN ('payroll_upload', 'manual_setup')),
    status text DEFAULT 'initiated' CHECK (status IN ('initiated', 'processing', 'completed', 'failed', 'cancelled')),
    progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    total_employees_expected integer,
    total_employees_created integer DEFAULT 0,
    total_departments_created integer DEFAULT 0,
    conversion_started_at timestamp with time zone,
    conversion_completed_at timestamp with time zone,
    error_details jsonb,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT trial_conversions_pkey PRIMARY KEY (id),
    CONSTRAINT trial_conversions_original_company_id_fkey FOREIGN KEY (original_company_id) REFERENCES public.companies(id),
    CONSTRAINT trial_conversions_converted_company_id_fkey FOREIGN KEY (converted_company_id) REFERENCES public.companies(id),
    CONSTRAINT trial_conversions_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES public.payroll_uploads(id)
);

-- Table for conversion notifications
CREATE TABLE public.conversion_notifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    conversion_id uuid NOT NULL,
    notification_type text NOT NULL CHECK (notification_type IN ('email', 'whatsapp', 'in_app')),
    recipient text NOT NULL, -- email or phone number
    message_template text NOT NULL,
    message_content text NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    sent_at timestamp with time zone,
    delivery_confirmed_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT conversion_notifications_pkey PRIMARY KEY (id),
    CONSTRAINT conversion_notifications_conversion_id_fkey FOREIGN KEY (conversion_id) REFERENCES public.trial_conversions(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_payroll_uploads_company_id ON public.payroll_uploads(company_id);
CREATE INDEX idx_payroll_uploads_tenant_id ON public.payroll_uploads(tenant_id);
CREATE INDEX idx_payroll_uploads_status ON public.payroll_uploads(upload_status);
CREATE INDEX idx_payroll_extracted_employees_upload_id ON public.payroll_extracted_employees(upload_id);
CREATE INDEX idx_trial_conversions_tenant_id ON public.trial_conversions(tenant_id);
CREATE INDEX idx_trial_conversions_status ON public.trial_conversions(status);

-- RLS Policies
ALTER TABLE public.payroll_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_extracted_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_notifications ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all payroll uploads
CREATE POLICY "Super admins can manage payroll uploads" ON public.payroll_uploads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND role = 'super_admin'
        )
    );

-- Company admins can view their own uploads
CREATE POLICY "Company admins can view their uploads" ON public.payroll_uploads
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND role IN ('company_admin', 'super_admin')
        )
    );

-- Super admins can manage extracted employees
CREATE POLICY "Super admins can manage extracted employees" ON public.payroll_extracted_employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND role = 'super_admin'
        )
    );

-- Super admins can manage trial conversions
CREATE POLICY "Super admins can manage trial conversions" ON public.trial_conversions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND role = 'super_admin'
        )
    );

-- Super admins can manage conversion notifications
CREATE POLICY "Super admins can manage conversion notifications" ON public.conversion_notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND role = 'super_admin'
        )
    );

-- Function to update conversion progress
CREATE OR REPLACE FUNCTION update_conversion_progress(
    p_conversion_id uuid,
    p_progress_percentage integer,
    p_employees_created integer DEFAULT NULL,
    p_departments_created integer DEFAULT NULL
) RETURNS void AS $$
BEGIN
    UPDATE public.trial_conversions
    SET 
        progress_percentage = p_progress_percentage,
        total_employees_created = COALESCE(p_employees_created, total_employees_created),
        total_departments_created = COALESCE(p_departments_created, total_departments_created),
        updated_at = now()
    WHERE id = p_conversion_id;
END;
$$ LANGUAGE plpgsql;

-- Function to complete conversion
CREATE OR REPLACE FUNCTION complete_conversion(
    p_conversion_id uuid,
    p_converted_company_id uuid,
    p_total_employees integer,
    p_total_departments integer
) RETURNS void AS $$
BEGIN
    UPDATE public.trial_conversions
    SET 
        status = 'completed',
        converted_company_id = p_converted_company_id,
        total_employees_created = p_total_employees,
        total_departments_created = p_total_departments,
        progress_percentage = 100,
        conversion_completed_at = now(),
        updated_at = now()
    WHERE id = p_conversion_id;
END;
$$ LANGUAGE plpgsql;

-- Function to fail conversion
CREATE OR REPLACE FUNCTION fail_conversion(
    p_conversion_id uuid,
    p_error_details jsonb
) RETURNS void AS $$
BEGIN
    UPDATE public.trial_conversions
    SET 
        status = 'failed',
        error_details = p_error_details,
        conversion_completed_at = now(),
        updated_at = now()
    WHERE id = p_conversion_id;
END;
$$ LANGUAGE plpgsql;
