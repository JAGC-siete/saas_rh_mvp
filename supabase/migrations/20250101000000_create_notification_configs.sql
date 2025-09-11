-- Crear tabla de configuración por defecto de notificaciones
CREATE TABLE IF NOT EXISTS default_notification_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_provider JSONB NOT NULL DEFAULT '{"type": "resend", "fromEmail": "noreply@cloudhr.hn", "fromName": "CloudHR", "timeout": 10000}',
  whatsapp_provider JSONB NOT NULL DEFAULT '{"type": "meta", "timeout": 10000}',
  retry_attempts INTEGER NOT NULL DEFAULT 1,
  retry_delay INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de configuración específica por empresa
CREATE TABLE IF NOT EXISTS company_notification_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email_provider JSONB,
  whatsapp_provider JSONB,
  retry_attempts INTEGER,
  retry_delay INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id)
);

-- Insertar configuración por defecto
INSERT INTO default_notification_configs (email_provider, whatsapp_provider, retry_attempts, retry_delay)
VALUES (
  '{"type": "resend", "fromEmail": "noreply@cloudhr.hn", "fromName": "CloudHR", "timeout": 10000}',
  '{"type": "meta", "timeout": 10000}',
  1,
  1000
) ON CONFLICT DO NOTHING;

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_company_notification_configs_company_id ON company_notification_configs(company_id);
CREATE INDEX IF NOT EXISTS idx_default_notification_configs_created_at ON default_notification_configs(created_at);

-- Crear función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear triggers para actualizar timestamp
CREATE TRIGGER update_default_notification_configs_updated_at 
  BEFORE UPDATE ON default_notification_configs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_notification_configs_updated_at 
  BEFORE UPDATE ON company_notification_configs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Crear políticas RLS
ALTER TABLE default_notification_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_notification_configs ENABLE ROW LEVEL SECURITY;

-- Política para default_notification_configs (solo lectura para usuarios autenticados)
CREATE POLICY "Users can read default notification configs" ON default_notification_configs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Política para company_notification_configs (usuarios solo pueden ver config de su empresa)
CREATE POLICY "Users can read their company notification configs" ON company_notification_configs
  FOR SELECT USING (
    auth.role() = 'authenticated' AND 
    company_id IN (
      SELECT company_id FROM employees WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Política para company_notification_configs (solo admins pueden modificar)
CREATE POLICY "Only admins can modify company notification configs" ON company_notification_configs
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM employees 
      WHERE email = auth.jwt() ->> 'email' 
      AND role ILIKE '%admin%'
    )
  );

-- Comentarios para documentación
COMMENT ON TABLE default_notification_configs IS 'Configuración por defecto de notificaciones para todas las empresas';
COMMENT ON TABLE company_notification_configs IS 'Configuración específica de notificaciones por empresa (sobrescribe la configuración por defecto)';
COMMENT ON COLUMN default_notification_configs.email_provider IS 'Configuración del proveedor de email en formato JSON';
COMMENT ON COLUMN default_notification_configs.whatsapp_provider IS 'Configuración del proveedor de WhatsApp en formato JSON';
COMMENT ON COLUMN default_notification_configs.retry_attempts IS 'Número de reintentos para envío de notificaciones';
COMMENT ON COLUMN default_notification_configs.retry_delay IS 'Delay entre reintentos en milisegundos';
