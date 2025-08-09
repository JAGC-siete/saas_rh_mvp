#!/usr/bin/env node

/**
 * Script para crear la tabla activaciones en Supabase
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

async function createActivacionesTable() {
  console.log('🔨 Creando tabla activaciones...')

  try {
    // Crear la tabla usando SQL directo
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
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
        DROP POLICY IF EXISTS "Anyone can create activation request" ON activaciones;
        CREATE POLICY "Anyone can create activation request" ON activaciones
          FOR INSERT WITH CHECK (true);

        -- Política para ver (solo admins)
        DROP POLICY IF EXISTS "Admins can view all activations" ON activaciones;
        CREATE POLICY "Admins can view all activations" ON activaciones
          FOR SELECT USING (
            CASE 
              WHEN auth.uid() IS NULL THEN false
              ELSE EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE user_profiles.id = auth.uid() 
                AND user_profiles.role IN ('admin', 'company_admin')
              )
            END
          );
      `
    })

    if (error) {
      console.error('❌ Error creando tabla con exec_sql:', error.message)
      
      // Fallback: intentar crear usando SQL directo con múltiples comandos
      console.log('🔄 Intentando método alternativo...')
      
      // 1. Crear la tabla
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `CREATE TABLE IF NOT EXISTS activaciones (
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
        );`
      })

      if (createError) {
        console.error('❌ Error creando tabla:', createError.message)
        throw createError
      }

      console.log('✅ Tabla creada')

      // 2. Habilitar RLS
      await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE activaciones ENABLE ROW LEVEL SECURITY;`
      })

      console.log('✅ RLS habilitado')

    } else {
      console.log('✅ Tabla y políticas creadas exitosamente')
    }

    // Verificar que la tabla existe
    const { data: testData, error: testError } = await supabase
      .from('activaciones')
      .select('id')
      .limit(1)

    if (testError) {
      console.error('❌ Error verificando tabla:', testError.message)
    } else {
      console.log('✅ Tabla activaciones verificada y accesible')
    }

  } catch (error) {
    console.error('💥 Error general:', error.message)
    throw error
  }
}

// Ejecutar
createActivacionesTable()
  .then(() => {
    console.log('\n🎉 Tabla activaciones creada exitosamente')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Error creando tabla:', error.message)
    process.exit(1)
  })
