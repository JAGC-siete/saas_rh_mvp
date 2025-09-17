-- CLEAN MIGRATION: Add only what's missing for employee PIN authentication
-- Based on existing schema structure

-- 1. Add PIN field to existing employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS employee_pin_hash TEXT;

-- 2. Create employee authentication sessions table
CREATE TABLE IF NOT EXISTS public.employee_auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    session_token_hash TEXT UNIQUE NOT NULL,
    jti UUID DEFAULT gen_random_uuid(),
    rotated_from UUID,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_fingerprint TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Security constraints
    CONSTRAINT chk_token_hash_hex CHECK (session_token_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT chk_expires_future CHECK (expires_at > created_at),
    CONSTRAINT chk_revoked_when_inactive CHECK (is_active = TRUE OR revoked_at IS NOT NULL)
);

-- 3. Create employee auth logs table
CREATE TABLE IF NOT EXISTS public.employee_auth_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id),
    last5_dni_hash TEXT NOT NULL,
    auth_attempt_result TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_result CHECK (auth_attempt_result IN ('success', 'invalid_credentials', 'rate_limited', 'ip_rate_limited', 'employee_rate_limited'))
);

-- 4. Create IP-based failed attempts table
CREATE TABLE IF NOT EXISTS public.employee_failed_attempts_ip (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id),
    attempt_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(ip_address, company_id)
);

-- 5. Create employee-based failed attempts table
CREATE TABLE IF NOT EXISTS public.employee_failed_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    last5_dni_hash TEXT NOT NULL,
    ip_address INET NOT NULL,
    attempt_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(employee_id, ip_address)
);

-- 6. Enable RLS on new tables
ALTER TABLE public.employee_auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_auth_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_failed_attempts_ip ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_failed_attempts ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies - SECURE
CREATE POLICY "Users can view their own employee sessions" ON public.employee_auth_sessions
    FOR SELECT USING (
        employee_id IN (
            SELECT employee_id FROM public.user_profiles 
            WHERE id = auth.uid()
            AND employee_id IS NOT NULL
        )
    );

CREATE POLICY "System can manage employee sessions" ON public.employee_auth_sessions
    FOR ALL USING (false);

CREATE POLICY "HR can view employee auth logs" ON public.employee_auth_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            JOIN public.employees e ON e.id = up.employee_id
            WHERE up.id = auth.uid() 
            AND up.role IN ('company_admin', 'hr_manager')
            AND e.company_id = (
                SELECT company_id FROM public.employees WHERE id = employee_auth_logs.employee_id
            )
        )
    );

-- 8. Create indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS ux_employee_sessions_token_hash ON public.employee_auth_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_employee_sessions_employee ON public.employee_auth_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_sessions_expires ON public.employee_auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_employees_dni_last5 ON public.employees USING btree (RIGHT(dni, 5));
CREATE INDEX IF NOT EXISTS idx_employee_auth_logs_employee ON public.employee_auth_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_auth_logs_created ON public.employee_auth_logs(created_at);

-- 9. Utility functions
CREATE OR REPLACE FUNCTION generate_employee_session_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- 10. Main authentication function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION authenticate_employee(
    p_company_id UUID,
    p_last5 TEXT,
    p_pin TEXT,
    p_pin_pepper TEXT,
    p_last5_pepper TEXT,
    p_ip_address INET,
    p_user_agent TEXT
)
RETURNS TABLE(
    success BOOLEAN,
    session_token TEXT,
    expires_at TIMESTAMPTZ,
    employee_data JSONB,
    error_message TEXT,
    locked_until TIMESTAMPTZ
) AS $$
DECLARE
    v_employee RECORD;
    v_token TEXT;
    v_token_hash TEXT;
    v_expires TIMESTAMPTZ;
    v_attempts_ip INTEGER;
    v_attempts_emp INTEGER;
    v_locked_until_ip TIMESTAMPTZ;
    v_locked_until_emp TIMESTAMPTZ;
    v_hmac_pin TEXT;
    v_last5_hash TEXT;
BEGIN
    -- Security: Fix search_path
    PERFORM set_config('search_path', 'pg_catalog, public', true);
    
    -- Validate inputs
    IF p_company_id IS NULL OR p_last5 IS NULL OR p_pin IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::JSONB, 
                          'Parámetros inválidos', NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- Peppers validated at API level for better error handling
    
    -- Generate hashes using app-provided peppers
    v_hmac_pin := encode(hmac(p_pin, p_pin_pepper, 'sha256'::text), 'hex');
    v_last5_hash := encode(hmac(p_last5, p_last5_pepper, 'sha256'::text), 'hex');
    
    -- IP-based rate limiting
    INSERT INTO public.employee_failed_attempts_ip (ip_address, company_id, attempt_count, window_start, locked_until)
    VALUES (p_ip_address, p_company_id, 1, NOW(), NULL)
    ON CONFLICT (ip_address, company_id) 
    DO UPDATE SET
        attempt_count = CASE
            WHEN NOW() - employee_failed_attempts_ip.window_start > INTERVAL '15 minutes' THEN 1
            ELSE employee_failed_attempts_ip.attempt_count + 1
        END,
        window_start = CASE
            WHEN NOW() - employee_failed_attempts_ip.window_start > INTERVAL '15 minutes' THEN NOW()
            ELSE employee_failed_attempts_ip.window_start
        END,
        locked_until = CASE
            WHEN (CASE
                WHEN NOW() - employee_failed_attempts_ip.window_start > INTERVAL '15 minutes' THEN 1
                ELSE employee_failed_attempts_ip.attempt_count + 1
            END) >= 10 THEN NOW() + INTERVAL '1 hour'
            ELSE employee_failed_attempts_ip.locked_until
        END,
        updated_at = NOW()
    RETURNING attempt_count, locked_until INTO v_attempts_ip, v_locked_until_ip;

    -- Check IP lockout
    IF v_locked_until_ip IS NOT NULL AND v_locked_until_ip > NOW() THEN
        INSERT INTO public.employee_auth_logs (employee_id, last5_dni_hash, auth_attempt_result, ip_address, user_agent)
        VALUES (NULL, v_last5_hash, 'ip_rate_limited', p_ip_address, p_user_agent);
        
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::JSONB, 
                          'IP bloqueada', v_locked_until_ip;
        RETURN;
    END IF;

    -- Find employee
    SELECT e.id, e.name, e.dni, e.role, e.company_id, e.employee_pin_hash, d.name as dept_name
    INTO v_employee
    FROM public.employees e
    LEFT JOIN public.departments d ON d.id = e.department_id
    WHERE e.company_id = p_company_id
      AND RIGHT(e.dni, 5) = p_last5
      AND e.status = 'active'
      AND (e.termination_date IS NULL OR e.termination_date > CURRENT_DATE)
      AND e.employee_pin_hash IS NOT NULL
    LIMIT 1;

    -- Employee-level rate limiting
    IF v_employee.id IS NOT NULL THEN
        INSERT INTO public.employee_failed_attempts (employee_id, last5_dni_hash, ip_address, attempt_count, window_start, locked_until)
        VALUES (v_employee.id, v_last5_hash, p_ip_address, 1, NOW(), NULL)
        ON CONFLICT (employee_id, ip_address) 
        DO UPDATE SET
            attempt_count = CASE
                WHEN NOW() - employee_failed_attempts.window_start > INTERVAL '15 minutes' THEN 1
                ELSE employee_failed_attempts.attempt_count + 1
            END,
            window_start = CASE
                WHEN NOW() - employee_failed_attempts.window_start > INTERVAL '15 minutes' THEN NOW()
                ELSE employee_failed_attempts.window_start
            END,
            locked_until = CASE
                WHEN (CASE
                    WHEN NOW() - employee_failed_attempts.window_start > INTERVAL '15 minutes' THEN 1
                    ELSE employee_failed_attempts.attempt_count + 1
                END) >= 5 THEN NOW() + INTERVAL '30 minutes'
                ELSE employee_failed_attempts.locked_until
            END,
            updated_at = NOW()
        RETURNING attempt_count, locked_until INTO v_attempts_emp, v_locked_until_emp;

        -- Check employee lockout
        IF v_locked_until_emp IS NOT NULL AND v_locked_until_emp > NOW() THEN
            INSERT INTO public.employee_auth_logs (employee_id, last5_dni_hash, auth_attempt_result, ip_address, user_agent)
            VALUES (v_employee.id, v_last5_hash, 'employee_rate_limited', p_ip_address, p_user_agent);
            
            RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::JSONB, 
                              'Cuenta bloqueada', v_locked_until_emp;
            RETURN;
        END IF;
    END IF;

    -- Verify PIN
    IF v_employee.id IS NULL OR NOT (crypt(v_hmac_pin, v_employee.employee_pin_hash) = v_employee.employee_pin_hash) THEN
        INSERT INTO public.employee_auth_logs (employee_id, last5_dni_hash, auth_attempt_result, ip_address, user_agent)
        VALUES (v_employee.id, v_last5_hash, 'invalid_credentials', p_ip_address, p_user_agent);
        
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::JSONB, 
                          'Credenciales inválidas', NULL::TIMESTAMPTZ;
        RETURN;
    END IF;

    -- Create session
    v_token := generate_employee_session_token();
    v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
    v_expires := NOW() + INTERVAL '8 hours';

    INSERT INTO public.employee_auth_sessions (employee_id, session_token_hash, expires_at, ip_address, user_agent)
    VALUES (v_employee.id, v_token_hash, v_expires, p_ip_address, p_user_agent);

    -- Clear failed attempts on success
    DELETE FROM public.employee_failed_attempts 
    WHERE employee_id = v_employee.id AND ip_address = p_ip_address;
    
    DELETE FROM public.employee_failed_attempts_ip 
    WHERE ip_address = p_ip_address AND company_id = p_company_id;

    -- Log success
    INSERT INTO public.employee_auth_logs (employee_id, last5_dni_hash, auth_attempt_result, ip_address, user_agent)
    VALUES (v_employee.id, v_last5_hash, 'success', p_ip_address, p_user_agent);

    -- Return success
    RETURN QUERY SELECT TRUE, v_token, v_expires, 
                       jsonb_build_object(
                           'id', v_employee.id,
                           'name', v_employee.name,
                           'dni_masked', LEFT(v_employee.dni, 4) || '****' || RIGHT(v_employee.dni, 5),
                           'role', COALESCE(v_employee.role, 'Empleado'),
                           'department', v_employee.dept_name
                       ),
                       NULL::TEXT, NULL::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_employee_data()
RETURNS TABLE(
    sessions_deleted INTEGER,
    logs_deleted INTEGER,
    attempts_deleted INTEGER
) AS $$
DECLARE
    v_sessions_deleted INTEGER;
    v_logs_deleted INTEGER;
    v_attempts_deleted INTEGER;
BEGIN
    PERFORM set_config('search_path', 'pg_catalog, public', true);
    
    DELETE FROM public.employee_auth_sessions 
    WHERE expires_at < NOW() OR (is_active = FALSE AND revoked_at < NOW() - INTERVAL '7 days');
    GET DIAGNOSTICS v_sessions_deleted = ROW_COUNT;
    
    DELETE FROM public.employee_auth_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS v_logs_deleted = ROW_COUNT;
    
    DELETE FROM public.employee_failed_attempts 
    WHERE (locked_until IS NULL OR locked_until < NOW() - INTERVAL '1 day')
      AND created_at < NOW() - INTERVAL '1 day';
      
    DELETE FROM public.employee_failed_attempts_ip 
    WHERE (locked_until IS NULL OR locked_until < NOW() - INTERVAL '1 day')
      AND created_at < NOW() - INTERVAL '1 day';
    GET DIAGNOSTICS v_attempts_deleted = ROW_COUNT;
    
    RETURN QUERY SELECT v_sessions_deleted, v_logs_deleted, v_attempts_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Set function permissions
REVOKE ALL ON FUNCTION authenticate_employee FROM PUBLIC;
REVOKE ALL ON FUNCTION cleanup_expired_employee_data FROM PUBLIC;
GRANT EXECUTE ON FUNCTION authenticate_employee TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_employee_data TO authenticated;

-- 13. Comments
COMMENT ON COLUMN public.employees.employee_pin_hash IS 'PIN hasheado con HMAC-SHA256 + bcrypt para autenticación segura';
COMMENT ON TABLE public.employee_auth_sessions IS 'Sesiones de autenticación de empleados - solo hash del token';
COMMENT ON TABLE public.employee_auth_logs IS 'Auditoría de intentos de autenticación - datos hasheados';
COMMENT ON TABLE public.employee_failed_attempts IS 'Bloqueo por intentos fallidos - previene ataques de fuerza bruta';
