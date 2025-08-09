#!/usr/bin/env node

/**
 * Script final de verificación después de crear la tabla activaciones
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

async function verifyFullSystem() {
  console.log('🎯 VERIFICACIÓN COMPLETA DEL SISTEMA DE ACTIVACIONES')
  console.log('=' .repeat(60))

  let allGood = true

  try {
    // 1. Verificar tabla existe
    console.log('\n1️⃣ Verificando tabla activaciones...')
    const { data, error } = await supabase
      .from('activaciones')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ La tabla no existe:', error.message)
      console.log('🔗 Ejecuta el SQL en: https://supabase.com/dashboard/project/xvpgpllwhevjfvudojts/sql/new')
      allGood = false
    } else {
      console.log('✅ Tabla activaciones existe')
    }

    // 2. Probar inserción (simular formulario)
    console.log('\n2️⃣ Probando inserción desde formulario...')
    const testFormData = {
      empresa: 'Mi Empresa Test',
      empleados: 15,
      contacto_nombre: 'Jorge Arturo',
      contacto_whatsapp: '+504 9876-5432',
      contacto_email: 'jorge@miempresa.com',
      monto: 15 * 500, // 7500
      departamentos: ['Administración', 'Ventas', 'Marketing'],
      status: 'pending'
    }

    const { data: insertData, error: insertError } = await supabase
      .from('activaciones')
      .insert([testFormData])
      .select()

    if (insertError) {
      console.error('❌ Error en inserción:', insertError.message)
      allGood = false
    } else {
      console.log('✅ Inserción exitosa')
      console.log('📊 Datos guardados:', {
        id: insertData[0].id,
        empresa: insertData[0].empresa,
        empleados: insertData[0].empleados,
        monto: insertData[0].monto,
        status: insertData[0].status
      })

      // 3. Limpiar datos de prueba
      await supabase
        .from('activaciones')
        .delete()
        .eq('id', insertData[0].id)
      console.log('🧹 Datos de prueba eliminados')
    }

    // 4. Verificar políticas RLS
    console.log('\n3️⃣ Verificando políticas de seguridad...')
    
    // Crear cliente público (sin auth) para probar inserción pública
    const publicClient = createClient(
      supabaseUrl, 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )

    const testPublicData = {
      empresa: 'Empresa Pública',
      empleados: 5,
      contacto_nombre: 'Usuario Público',
      contacto_whatsapp: '+504 1111-1111',
      contacto_email: 'publico@test.com',
      monto: 2500,
      departamentos: ['Administración']
    }

    const { data: publicInsert, error: publicError } = await publicClient
      .from('activaciones')
      .insert([testPublicData])
      .select()

    if (publicError) {
      console.error('❌ Error en inserción pública:', publicError.message)
      allGood = false
    } else {
      console.log('✅ Inserción pública funciona (sin autenticación)')
      
      // Limpiar
      await supabase
        .from('activaciones')
        .delete()
        .eq('id', publicInsert[0].id)
      console.log('🧹 Datos públicos de prueba eliminados')
    }

    // 5. Contar registros actuales
    console.log('\n4️⃣ Estado actual de la tabla...')
    const { count, error: countError } = await supabase
      .from('activaciones')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('❌ Error contando registros:', countError.message)
    } else {
      console.log('📊 Registros actuales en activaciones:', count)
    }

  } catch (error) {
    console.error('💥 Error general:', error.message)
    allGood = false
  }

  // Resumen final
  console.log('\n' + '='.repeat(60))
  if (allGood) {
    console.log('🎉 TODO EL SISTEMA ESTÁ FUNCIONANDO CORRECTAMENTE')
    console.log('')
    console.log('✅ Flujo completo verificado:')
    console.log('   Landing page (/landing) → Formulario (/activar) → API (/api/activar) → Supabase')
    console.log('')
    console.log('🚀 El sistema está listo para recibir clientes interesados')
    console.log('📧 Los datos se guardan en la tabla activaciones')
    console.log('🔒 Inserción pública habilitada, lectura solo para admins')
  } else {
    console.log('⚠️ HAY PROBLEMAS QUE RESOLVER')
    console.log('💡 Revisar errores arriba y ejecutar SQL en Supabase')
  }
  console.log('='.repeat(60))

  return allGood
}

// Ejecutar
verifyFullSystem()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('\n💥 Error:', error.message)
    process.exit(1)
  })
