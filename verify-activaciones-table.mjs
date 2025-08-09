#!/usr/bin/env node

/**
 * Script para crear la tabla activaciones usando el método directo de Supabase
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno faltantes')
  process.exit(1)
}

// Cliente con privilegios de servicio
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testAndCreateTable() {
  console.log('🔍 Verificando si la tabla activaciones existe...')

  try {
    // Primero intentar hacer una consulta simple para ver si la tabla existe
    const { data, error } = await supabase
      .from('activaciones')
      .select('id')
      .limit(1)

    if (error && error.message.includes('does not exist')) {
      console.log('❌ La tabla activaciones no existe')
      console.log('📝 Por favor, ejecuta este SQL en la consola de Supabase:')
      console.log('🔗 https://supabase.com/dashboard/project/xvpgpllwhevjfvudojts/sql/new')
      console.log('\n--- SQL PARA EJECUTAR ---')
      console.log(`
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
  comprobante TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'active', 'rejected')),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
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

-- Política para insertar nuevas activaciones (público - sin autenticación requerida)
CREATE POLICY "Anyone can create activation request" ON activaciones
  FOR INSERT WITH CHECK (true);

-- Política para que solo admins puedan ver todas las activaciones
CREATE POLICY "Admins can view all activations" ON activaciones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('admin', 'company_admin')
    )
  );

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
      `)
      console.log('--- FIN DEL SQL ---\n')
      
      return false
    } else if (error) {
      console.error('❌ Error desconocido:', error.message)
      return false
    } else {
      console.log('✅ La tabla activaciones ya existe')
      
      // Probar inserción
      console.log('🧪 Probando inserción de datos...')
      const testData = {
        empresa: 'Test Company',
        empleados: 5,
        contacto_nombre: 'Test User',
        contacto_whatsapp: '+504 9999-9999',
        contacto_email: 'test@example.com',
        monto: 2500.00,
        departamentos: ['Administración', 'Ventas']
      }

      const { data: insertData, error: insertError } = await supabase
        .from('activaciones')
        .insert([testData])
        .select()

      if (insertError) {
        console.error('❌ Error en inserción de prueba:', insertError.message)
        return false
      } else {
        console.log('✅ Inserción exitosa:', insertData[0])
        
        // Limpiar datos de prueba
        if (insertData && insertData[0]) {
          await supabase
            .from('activaciones')
            .delete()
            .eq('id', insertData[0].id)
          console.log('🧹 Datos de prueba eliminados')
        }
        
        return true
      }
    }

  } catch (error) {
    console.error('💥 Error general:', error.message)
    return false
  }
}

// Ejecutar
testAndCreateTable()
  .then((success) => {
    if (success) {
      console.log('\n🎉 La tabla activaciones está lista y funcional')
      console.log('🔗 API endpoint disponible en: /api/activar')
      console.log('📝 Frontend puede enviar datos del formulario sin problemas')
    } else {
      console.log('\n⚠️ Se requiere acción manual para crear la tabla')
    }
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('\n💥 Error:', error.message)
    process.exit(1)
  })
