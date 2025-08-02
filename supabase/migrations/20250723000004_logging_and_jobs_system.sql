-- Migración para sistema de logging y jobs administrativos
-- Fecha: 2025-01-27

-- Tabla para logs del sistema
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    level VARCHAR(10) NOT NULL CHECK (level IN ('error', 'warn', 'info', 'http', 'debug')),
    message TEXT NOT NULL,
    meta JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para logs de auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para backups de datos
CREATE TABLE IF NOT EXISTS data_backups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    backup_type VARCHAR(50) NOT NULL,
    backup_data JSONB NOT NULL,
    backup_date TIMESTAMPTZ NOT NULL,
    version VARCHAR(20),
    size_bytes BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para reportes generados automáticamente
CREATE TABLE IF NOT EXISTS generated_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL,
    data JSONB,
    summary JSONB,
    file_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para sesiones de usuario (para cleanup)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para jobs ejecutados
CREATE TABLE IF NOT EXISTS job_executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_data_backups_type ON data_backups(backup_type);
CREATE INDEX IF NOT EXISTS idx_data_backups_date ON data_backups(backup_date);

CREATE INDEX IF NOT EXISTS idx_generated_reports_type ON generated_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_generated_reports_date ON generated_reports(generated_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_job_executions_name ON job_executions(job_name);
CREATE INDEX IF NOT EXISTS idx_job_executions_status ON job_executions(status);
CREATE INDEX IF NOT EXISTS idx_job_executions_started_at ON job_executions(started_at);

-- Políticas RLS para system_logs
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System logs are viewable by admins only" ON system_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

CREATE POLICY "System logs are insertable by service role" ON system_logs
    FOR INSERT WITH CHECK (true);

-- Políticas RLS para audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit logs are viewable by admins only" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

CREATE POLICY "Audit logs are insertable by authenticated users" ON audit_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas RLS para data_backups
ALTER TABLE data_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Data backups are viewable by admins only" ON data_backups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

CREATE POLICY "Data backups are insertable by service role" ON data_backups
    FOR INSERT WITH CHECK (true);

-- Políticas RLS para generated_reports
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Generated reports are viewable by admins only" ON generated_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

CREATE POLICY "Generated reports are insertable by service role" ON generated_reports
    FOR INSERT WITH CHECK (true);

-- Políticas RLS para user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON user_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON user_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON user_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para job_executions
ALTER TABLE job_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Job executions are viewable by admins only" ON job_executions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

CREATE POLICY "Job executions are insertable by service role" ON job_executions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Job executions are updatable by service role" ON job_executions
    FOR UPDATE USING (true);

-- Función para limpiar logs antiguos automáticamente
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    -- Limpiar logs del sistema más antiguos de 90 días
    DELETE FROM system_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Limpiar logs de auditoría más antiguos de 1 año
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Limpiar backups más antiguos de 6 meses
    DELETE FROM data_backups 
    WHERE created_at < NOW() - INTERVAL '6 months';
    
    -- Limpiar reportes generados más antiguos de 3 meses
    DELETE FROM generated_reports 
    WHERE created_at < NOW() - INTERVAL '3 months';
    
    -- Limpiar ejecuciones de jobs más antiguas de 30 días
    DELETE FROM job_executions 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Función para registrar logs del sistema
CREATE OR REPLACE FUNCTION log_system_event(
    p_level VARCHAR(10),
    p_message TEXT,
    p_meta JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO system_logs (level, message, meta)
    VALUES (p_level, p_message, p_meta)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Función para registrar eventos de auditoría
CREATE OR REPLACE FUNCTION log_audit_event(
    p_action VARCHAR(100),
    p_resource_type VARCHAR(50) DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id, 
        action, 
        resource_type, 
        resource_id, 
        details, 
        ip_address, 
        user_agent
    )
    VALUES (
        auth.uid(),
        p_action,
        p_resource_type,
        p_resource_id,
        p_details,
        p_ip_address,
        p_user_agent
    )
    RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

-- Función para registrar ejecución de jobs
CREATE OR REPLACE FUNCTION log_job_execution(
    p_job_name VARCHAR(100),
    p_status VARCHAR(20),
    p_result JSONB DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_duration_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    job_execution_id UUID;
BEGIN
    INSERT INTO job_executions (
        job_name,
        status,
        completed_at,
        duration_ms,
        result,
        error_message
    )
    VALUES (
        p_job_name,
        p_status,
        CASE WHEN p_status IN ('completed', 'failed') THEN NOW() ELSE NULL END,
        p_duration_ms,
        p_result,
        p_error_message
    )
    RETURNING id INTO job_execution_id;
    
    RETURN job_execution_id;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON TABLE system_logs IS 'Logs del sistema generados por Winston';
COMMENT ON TABLE audit_logs IS 'Logs de auditoría para acciones de usuarios';
COMMENT ON TABLE data_backups IS 'Backups automáticos de datos críticos';
COMMENT ON TABLE generated_reports IS 'Reportes generados automáticamente';
COMMENT ON TABLE user_sessions IS 'Sesiones de usuario para cleanup automático';
COMMENT ON TABLE job_executions IS 'Registro de ejecuciones de jobs administrativos';

COMMENT ON FUNCTION cleanup_old_logs() IS 'Función para limpiar datos antiguos automáticamente';
COMMENT ON FUNCTION log_system_event(VARCHAR, TEXT, JSONB) IS 'Función para registrar logs del sistema';
COMMENT ON FUNCTION log_audit_event(VARCHAR, VARCHAR, UUID, JSONB, INET, TEXT) IS 'Función para registrar eventos de auditoría';
COMMENT ON FUNCTION log_job_execution(VARCHAR, VARCHAR, JSONB, TEXT, INTEGER) IS 'Función para registrar ejecuciones de jobs'; 