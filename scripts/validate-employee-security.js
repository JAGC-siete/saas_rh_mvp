#!/usr/bin/env node

/**
 * Script de validación de seguridad para el portal de empleados
 * Verifica que todas las medidas de seguridad estén correctamente implementadas
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const COMPANY_ID = '00000000-0000-0000-0000-000000000001' // Paragon

async function validateSecurity() {
  console.log('🔍 VALIDACIÓN DE SEGURIDAD - PORTAL DE EMPLEADOS')
  console.log('=' .repeat(60))

  // Validar environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: Variables de Supabase no configuradas')
    process.exit(1)
  }

  if (!process.env.EMPLOYEE_PIN_PEPPER || process.env.EMPLOYEE_PIN_PEPPER.length < 32) {
    console.error('❌ Error: EMPLOYEE_PIN_PEPPER no configurado o muy corto')
    process.exit(1)
  }

  if (!process.env.EMPLOYEE_LAST5_PEPPER || process.env.EMPLOYEE_LAST5_PEPPER.length < 32) {
    console.error('❌ Error: EMPLOYEE_LAST5_PEPPER no configurado o muy corto')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  let checks = []

  try {
    // 1. Verificar que la función authenticate_employee existe
    console.log('\n1️⃣ Verificando función authenticate_employee...')
    const { data: functionExists, error: funcError } = await supabase
      .rpc('authenticate_employee', {
        p_company_id: COMPANY_ID,
        p_last5: '00000', // Credenciales inválidas para test
        p_pin: '0000',
        p_pin_pepper: process.env.EMPLOYEE_PIN_PEPPER,
        p_last5_pepper: process.env.EMPLOYEE_LAST5_PEPPER,
        p_ip_address: '127.0.0.1',
        p_user_agent: 'Security Test'
      })

    if (funcError && !funcError.message.includes('invalid_credentials')) {
      checks.push(`❌ Función authenticate_employee: ${funcError.message}`)
    } else {
      checks.push('✅ Función authenticate_employee: Disponible')
    }

    // 2. Verificar tablas de seguridad
    console.log('\n2️⃣ Verificando tablas de seguridad...')
    
    const tables = [
      'employee_auth_sessions',
      'employee_auth_logs', 
      'employee_failed_attempts',
      'employee_failed_attempts_ip'
    ]

    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1)
      if (error) {
        checks.push(`❌ Tabla ${table}: ${error.message}`)
      } else {
        checks.push(`✅ Tabla ${table}: Existe`)
      }
    }

    // 3. Verificar empleados con PINs
    console.log('\n3️⃣ Verificando empleados con PINs...')
    const { data: employeesWithPins, error: empError } = await supabase
      .from('employees')
      .select('id, name, dni, employee_pin_hash')
      .eq('company_id', COMPANY_ID)
      .eq('status', 'active')
      .not('employee_pin_hash', 'is', null)

    if (empError) {
      checks.push(`❌ Empleados con PIN: ${empError.message}`)
    } else {
      checks.push(`✅ Empleados con PIN: ${employeesWithPins?.length || 0} configurados`)
      
      if (employeesWithPins && employeesWithPins.length > 0) {
        employeesWithPins.forEach(emp => {
          const last5 = emp.dni.slice(-5)
          console.log(`   👤 ${emp.name}: ***${last5} (PIN configurado)`)
        })
      }
    }

    // 4. Verificar índices de seguridad
    console.log('\n4️⃣ Verificando índices...')
    const { data: indexes, error: idxError } = await supabase
      .rpc('pg_indexes', { schemaname: 'public' })

    if (!idxError && indexes) {
      const securityIndexes = [
        'ux_employee_sessions_token_hash',
        'idx_employees_dni_last5'
      ]

      securityIndexes.forEach(idx => {
        const exists = indexes.some(i => i.indexname === idx)
        checks.push(exists ? `✅ Índice ${idx}: Existe` : `❌ Índice ${idx}: Falta`)
      })
    }

    // 5. Test de RLS policies
    console.log('\n5️⃣ Verificando RLS policies...')
    
    // Intentar acceso directo a sesiones (debe fallar)
    const { data: directAccess, error: rlsError } = await supabase
      .from('employee_auth_sessions')
      .select('*')
      .limit(1)

    if (rlsError && rlsError.message.includes('row-level security')) {
      checks.push('✅ RLS employee_auth_sessions: Activa')
    } else {
      checks.push('❌ RLS employee_auth_sessions: Vulnerable')
    }

  } catch (error) {
    checks.push(`❌ Error general: ${error.message}`)
  }

  // Mostrar resultados
  console.log('\n📋 RESULTADOS DE VALIDACIÓN:')
  console.log('=' .repeat(60))
  
  let passCount = 0
  let failCount = 0

  checks.forEach(check => {
    console.log(check)
    if (check.startsWith('✅')) passCount++
    if (check.startsWith('❌')) failCount++
  })

  console.log('\n📊 RESUMEN:')
  console.log(`✅ Pasaron: ${passCount}`)
  console.log(`❌ Fallaron: ${failCount}`)
  console.log(`📝 Total: ${checks.length}`)

  if (failCount === 0) {
    console.log('\n🎉 ¡VALIDACIÓN EXITOSA!')
    console.log('🔒 El sistema está listo para producción')
    console.log('\n📋 PRÓXIMOS PASOS:')
    console.log('1. Ejecutar: node scripts/setup-employee-pins.js')
    console.log('2. Configurar pg_cron para cleanup diario')
    console.log('3. Configurar monitoreo de intentos fallidos')
    console.log('4. Test de penetración manual')
  } else {
    console.log('\n⚠️  HAY PROBLEMAS DE SEGURIDAD')
    console.log('   Corrija los errores antes de continuar')
    process.exit(1)
  }
}

// Ejecutar validación
validateSecurity().catch(error => {
  console.error('💥 Error en validación:', error)
  process.exit(1)
})
