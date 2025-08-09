-- Crear tabla para almacenar solicitudes de activación
CREATE TABLE IF NOT EXISTS activaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleados INTEGER NOT NULL,
  empresa TEXT NOT NULL,
  contacto_nombre TEXT NOT NULL,
  contacto_whatsapp TEXT NOT NULL,
  contacto_email TEXT NOT NULL,
  departamentos JSONB DEFAULT '[]'::jsonb,
  monto DECIMAL(10,2) NOT NULL,
  comprobante TEXT, -- URL del comprobante subido
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'active', 'rejected')),
  notas TEXT, -- Para notas internas del admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_activaciones_status ON activaciones(status);
CREATE INDEX IF NOT EXISTS idx_activaciones_email ON activaciones(contacto_email);
CREATE INDEX IF NOT EXISTS idx_activaciones_empresa ON activaciones(empresa);
CREATE INDEX IF NOT EXISTS idx_activaciones_created_at ON activaciones(created_at);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_activaciones_updated_at 
    BEFORE UPDATE ON activaciones 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS (Row Level Security)
ALTER TABLE activaciones ENABLE ROW LEVEL SECURITY;

-- Política para que solo administradores puedan ver todas las activaciones
CREATE POLICY "Admins can view all activations" ON activaciones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('admin', 'company_admin')
    )
  );

-- Política para insertar nuevas activaciones (público - sin autenticación requerida)
CREATE POLICY "Anyone can create activation request" ON activaciones
  FOR INSERT WITH CHECK (true);

-- Política para que solo admins puedan actualizar
CREATE POLICY "Admins can update activations" ON activaciones
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('admin', 'company_admin')
    )
  );

-- Comentarios para documentación
COMMENT ON TABLE activaciones IS 'Solicitudes de activación del sistema de RH';
COMMENT ON COLUMN activaciones.status IS 'Estado: pending, verified, active, rejected';
COMMENT ON COLUMN activaciones.monto IS 'Monto total a pagar (empleados * 500)';
COMMENT ON COLUMN activaciones.comprobante IS 'URL del comprobante de pago subido';
COMMENT ON COLUMN activaciones.departamentos IS 'Array JSON con los departamentos seleccionados';
