#!/usr/bin/env node

/**
 * Script para verificar la estructura de Supabase y crear tablas necesarias
 * para el formulario de activación de la landing page
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno faltantes:')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

// Cliente con privilegios de servicio
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifySupabaseStructure() {
  console.log('🔍 Verificando estructura de Supabase...\n')

  try {
    // 1. Verificar tabla activaciones
    console.log('1️⃣ Verificando tabla activaciones...')
    const { data: activaciones, error: activacionesError } = await supabase
      .from('activaciones')
      .select('*')
      .limit(1)

    if (activacionesError) {
      console.error('❌ Error en tabla activaciones:', activacionesError.message)
      console.log('📝 Creando tabla activaciones...')
      await createActivacionesTable()
    } else {
      console.log('✅ Tabla activaciones existe y es accesible')
      console.log('📊 Registros actuales:', await getActivacionesCount())
    }

    // 2. Verificar políticas RLS
    console.log('\n2️⃣ Verificando políticas RLS...')
    const { data: policies, error: policiesError } = await supabase.rpc(
      'get_table_policies', 
      { table_name: 'activaciones' }
    )

    if (policiesError) {
      console.log('⚠️ No se pudieron verificar las políticas RLS')
    } else {
      console.log('✅ Políticas RLS verificadas')
    }

    // 3. Probar inserción pública
    console.log('\n3️⃣ Probando inserción pública...')
    const testData = {
      empresa: 'Test Company',
      empleados: 10,
      contacto_nombre: 'Test User',
      contacto_whatsapp: '+504 9999-9999',
      contacto_email: 'test@example.com',
      monto: 5000.00,
      departamentos: ['Administración', 'Ventas']
    }

    const { data: insertResult, error: insertError } = await supabase
      .from('activaciones')
      .insert([testData])
      .select()

    if (insertError) {
      console.error('❌ Error en inserción de prueba:', insertError.message)
    } else {
      console.log('✅ Inserción pública funciona correctamente')
      
      // Limpiar datos de prueba
      if (insertResult && insertResult[0]) {
        await supabase
          .from('activaciones')
          .delete()
          .eq('id', insertResult[0].id)
        console.log('🧹 Datos de prueba eliminados')
      }
    }

  } catch (error) {
    console.error('💥 Error general:', error.message)
  }
}

async function createActivacionesTable() {
  const createTableSQL = `
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

    -- Habilitar RLS
    ALTER TABLE activaciones ENABLE ROW LEVEL SECURITY;

    -- Política para insertar (público)
    CREATE POLICY "Anyone can create activation request" ON activaciones
      FOR INSERT WITH CHECK (true);

    -- Política para ver (solo admins)
    CREATE POLICY "Admins can view all activations" ON activaciones
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE user_profiles.id = auth.uid() 
          AND user_profiles.role IN ('admin', 'company_admin')
        )
      );
  `

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL })
    if (error) {
      console.error('❌ Error creando tabla:', error.message)
    } else {
      console.log('✅ Tabla activaciones creada exitosamente')
    }
  } catch (error) {
    console.error('💥 Error ejecutando SQL:', error.message)
  }
}

async function getActivacionesCount() {
  try {
    const { count, error } = await supabase
      .from('activaciones')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('Error contando registros:', error.message)
      return '❓'
    }

    return count || 0
  } catch (error) {
    console.error('Error:', error.message)
    return '❓'
  }
}

// Ejecutar verificación
verifySupabaseStructure()
  .then(() => {
    console.log('\n🎉 Verificación de Supabase completada')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Error en verificación:', error.message)
    process.exit(1)
  })
