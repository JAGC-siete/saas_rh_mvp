-- Migration generada desde las tablas creadas en Supabase UI
-- Ejecutar: supabase db diff --use-migra > supabase/migrations/[timestamp]_sync_ui_tables.sql

-- Si creaste tablas manualmente, añádelas aquí:
-- Ejemplo de estructura básica para empleados compatible con DNI lookup:

-- Tabla empleados (si no existe)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    dni TEXT NOT NULL,
    position TEXT,
    company_name TEXT DEFAULT 'Mi Empresa',
    checkin_time TIME DEFAULT '08:00',
    checkout_time TIME DEFAULT '17:00',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsqueda rápida por últimos 5 dígitos del DNI
CREATE INDEX IF NOT EXISTS idx_employees_dni_last5 ON employees (RIGHT(dni, 5));

-- Tabla de registros de asistencia
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    late_minutes INTEGER DEFAULT 0,
    justification TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(employee_id, date)
);

-- Datos de prueba (reemplaza con empleados reales)
INSERT INTO employees (name, dni, position, company_name) VALUES 
('María González', '0801-1990-12345', 'Desarrolladora', 'Mi Empresa'),
('Carlos Rodríguez', '0801-1985-67890', 'Analista', 'Mi Empresa'),
('Ana Martínez', '0801-1992-54321', 'Diseñadora', 'Mi Empresa')
ON CONFLICT (dni) DO NOTHING;

-- Comentarios para documentación
COMMENT ON TABLE employees IS 'Tabla de empleados con soporte para lookup por DNI';
COMMENT ON TABLE attendance_records IS 'Registros diarios de asistencia';
