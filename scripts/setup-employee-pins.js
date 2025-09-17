#!/usr/bin/env node

/**
 * Script para configurar PINs iniciales de empleados de Paragon
 * Usa PEPPER desde environment variables para máxima seguridad
 */

const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
const bcrypt = require('bcrypt')

// Configuración
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PIN_PEPPER = process.env.EMPLOYEE_PIN_PEPPER
const COMPANY_ID = '00000000-0000-0000-0000-000000000001' // Paragon

// Empleados REALES de Paragon con PINs temporales basados en last5 DNI
// PIN = last5 DNI truncado a 4 dígitos (temporal - cambiar después)
const PARAGON_EMPLOYEES = [
  { last5: '02088', pin: '2088', name: 'Enrique Alejandro Casco Murillo' },
  { last5: '09157', pin: '9157', name: 'Gerardo Leonel Fernandez Martinez' },
  { last5: '14588', pin: '4588', name: 'Seth Isaí Godoy Cantarero' },
  { last5: '17862', pin: '7862', name: 'Raúl Eduardo Espinoza Núñez' },
  { last5: '07986', pin: '7986', name: 'Gerson Enoc Zuniga Chang' },
  { last5: '21023', pin: '1023', name: 'Luis Eduardo Rojas Escalada' },
  { last5: '23863', pin: '3863', name: 'André Alexander García Laínez' },
  { last5: '15164', pin: '5164', name: 'Daniel Vladimir Hernadez Salgado' },
  { last5: '04394', pin: '4394', name: 'Evelin Daniela Oseguera Aguilar' },
  { last5: '10070', pin: '0070', name: 'Astrid Mariela Colindres Zelaya' },
  { last5: '00439', pin: '0439', name: 'Jonny Omar Salinas Rosales' },
  { last5: '20638', pin: '0638', name: 'Helen Daniela Matute Zambrano' },
  { last5: '02936', pin: '2936', name: 'Victor Enrique Maldonado Zelaya' },
  { last5: '15616', pin: '5616', name: 'Emely Rachel Romero Cabrera' },
  { last5: '14537', pin: '4537', name: 'Luis Francisco Murillo Carcamo' },
  { last5: '00142', pin: '0142', name: 'Francisco Javier Mendez Montenegro' },
  { last5: '22949', pin: '2949', name: 'Gustavo Noel Argueta Zelaya' },
  { last5: '03487', pin: '3487', name: 'Kenia Isabel Zambrano Molina' },
  { last5: '20200', pin: '0200', name: 'Wolfang Andre Sosa Lanza' },
  { last5: '00543', pin: '0543', name: 'Katerin Elizabeth Hernandez Martinez' },
  { last5: '02150', pin: '2150', name: 'Claudette Desiree Rollings Martinez' },
  { last5: '00731', pin: '0731', name: 'Jorge Arturo Gómez Coello' }, // Jefe de Personal
  { last5: '13174', pin: '3174', name: 'Amsi Abigail Urquía Durón' },
  { last5: '10716', pin: '0716', name: 'Alejandro José Salgado Girón' },
  { last5: '10071', pin: '0071', name: 'Ericka Daniela Martinez' },
  { last5: '22056', pin: '2056', name: 'Angel David Alvarenga Martinez' },
  { last5: '21037', pin: '1037', name: 'Lourdes Raquel Aguirre' },
  { last5: '00200', pin: '0200', name: 'Jorge Luis Rodriguez Macedo' }, // DUPLICATE last5!
  { last5: '10616', pin: '0616', name: 'Roberto Carlos Meraz Canales' },
  { last5: '15245', pin: '5245', name: 'Marcelo Alejandro Folgar Bonilla' },
  { last5: '09404', pin: '9404', name: 'David Alejandro Santos Ordoñez' },
  { last5: '12309', pin: '2309', name: 'Fabiola Yadira Castillo Moncada' },
  { last5: '00186', pin: '0186', name: 'David Gonzales Maldonado' },
  { last5: '21145', pin: '1145', name: 'Yorleny Paveth Oliva Maldonado' },
  { last5: '22694', pin: '2694', name: 'Isis Amaleth Ardon Maradiaga' },
  { last5: '04866', pin: '4866', name: 'Jesús Alcides Sagastume Martínez' }
]

async function main() {
  console.log('🔐 Configurando PINs seguros para empleados de Paragon...')

  // Validar environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridos')
    process.exit(1)
  }

  if (!PIN_PEPPER || PIN_PEPPER.length < 32) {
    console.error('❌ Error: EMPLOYEE_PIN_PEPPER debe tener al menos 32 caracteres')
    console.error('   Genere uno con: openssl rand -hex 32')
    process.exit(1)
  }

  // Crear cliente Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  console.log('✅ Conectado a Supabase')
  console.log(`🏢 Configurando empleados para company_id: ${COMPANY_ID}`)

  let successCount = 0
  let errorCount = 0
  const credentialsList = [] // Para guardar las credenciales generadas

  // Primero obtener todos los empleados activos de Paragon
  console.log('🔍 Obteniendo empleados activos de Paragon...')
  const { data: realEmployees, error: fetchError } = await supabase
    .from('employees')
    .select('id, dni, name, role, status')
    .eq('company_id', COMPANY_ID)
    .eq('status', 'active')

  if (fetchError) {
    console.error('❌ Error obteniendo empleados:', fetchError.message)
    process.exit(1)
  }

  if (!realEmployees || realEmployees.length === 0) {
    console.error('❌ No se encontraron empleados activos de Paragon')
    process.exit(1)
  }

  console.log(`✅ Encontrados ${realEmployees.length} empleados activos`)

  // Detectar duplicaciones de last5
  const last5Map = new Map()
  realEmployees.forEach(emp => {
    const last5 = emp.dni.slice(-5)
    if (!last5Map.has(last5)) {
      last5Map.set(last5, [])
    }
    last5Map.get(last5).push(emp)
  })

  const duplicates = Array.from(last5Map.entries()).filter(([last5, emps]) => emps.length > 1)
  if (duplicates.length > 0) {
    console.log('\n⚠️  ADVERTENCIA: Empleados con last5 DNI duplicados:')
    duplicates.forEach(([last5, emps]) => {
      console.log(`   Last5 ${last5}:`)
      emps.forEach(emp => console.log(`     - ${emp.name} (ID: ${emp.id})`))
    })
    console.log('   Estos empleados necesitarán PINs únicos manuales')
  }

  // Procesar cada empleado real
  for (const employee of realEmployees) {
    try {
      const last5 = employee.dni.slice(-5)
      
      // SECURE: Generar PIN aleatorio de 4 dígitos
      const pin = Math.floor(1000 + Math.random() * 9000).toString() // 1000-9999

      console.log(`\n👤 Procesando: ${employee.name}`)
      console.log(`   📋 Last5: ${last5} → PIN: ${pin} (ALEATORIO)`)

      // 1. HMAC del PIN con PEPPER
      const hmacPin = crypto
        .createHmac('sha256', PIN_PEPPER)
        .update(pin)
        .digest('hex')

      console.log(`   🔑 HMAC generado: ${hmacPin.substring(0, 8)}...`)

      // 2. bcrypt del resultado HMAC
      const pinHash = await bcrypt.hash(hmacPin, 10)
      console.log(`   🔒 Hash bcrypt generado: ${pinHash.substring(0, 20)}...`)

      // 3. Actualizar empleado en la base de datos
      const { data, error } = await supabase
        .from('employees')
        .update({ employee_pin_hash: pinHash })
        .eq('id', employee.id) // Usar ID específico para evitar duplicados
        .select('id, name, dni')

      if (error) {
        console.error(`   ❌ Error actualizando ${employee.name}:`, error.message)
        errorCount++
        continue
      }

      if (!data || data.length === 0) {
        console.error(`   ❌ Empleado no encontrado: ${employee.name}`)
        errorCount++
        continue
      }

      console.log(`   ✅ PIN configurado exitosamente`)
      console.log(`   📋 Credenciales: Last5=${last5} + PIN=${pin}`)
      
      // Guardar credenciales para el archivo de salida
      credentialsList.push({
        name: employee.name,
        role: employee.role || 'Sin especificar',
        last5: last5,
        pin: pin,
        id: employee.id
      })
      
      successCount++

    } catch (error) {
      console.error(`   💥 Error inesperado para ${employee.name}:`, error.message)
      errorCount++
    }
  }

  console.log('\n📊 RESUMEN:')
  console.log(`✅ Exitosos: ${successCount}`)
  console.log(`❌ Errores: ${errorCount}`)
  console.log(`📝 Total: ${realEmployees.length}`)

  // Guardar credenciales en archivo
  if (credentialsList.length > 0) {
    const fs = require('fs')
    const credentialsFile = 'paragon-employee-credentials.json'
    
    const output = {
      generatedAt: new Date().toISOString(),
      company: 'Paragon Honduras',
      companyId: COMPANY_ID,
      totalEmployees: credentialsList.length,
      instructions: {
        usage: 'Los empleados usan Last5 DNI + PIN para acceder al portal',
        url: '/employees/portal',
        security: 'PINs generados aleatoriamente y hasheados con PEPPER + bcrypt'
      },
      credentials: credentialsList.sort((a, b) => a.name.localeCompare(b.name))
    }
    
    fs.writeFileSync(credentialsFile, JSON.stringify(output, null, 2))
    console.log(`\n📄 Credenciales guardadas en: ${credentialsFile}`)
  }

  if (successCount === realEmployees.length) {
    console.log('\n🎉 ¡Todos los PINs configurados exitosamente!')
    console.log('🔐 Los empleados de Paragon pueden ahora usar el portal con:')
    console.log('   - Últimos 5 dígitos de su DNI')
    console.log('   - Su PIN de 4 dígitos (ALEATORIO)')
    
    if (credentialsList.length > 0) {
      console.log('\n📋 EJEMPLOS DE CREDENCIALES GENERADAS:')
      const managers = credentialsList.filter(c => 
        c.role.toLowerCase().includes('manager') || 
        c.role.toLowerCase().includes('jefe') ||
        c.role.toLowerCase().includes('gerente')
      )
      
      managers.slice(0, 3).forEach(emp => {
        console.log(`   ${emp.name} (${emp.role}): ${emp.last5} + PIN: ${emp.pin}`)
      })
      
      console.log(`\n📄 TODAS las credenciales están en: paragon-employee-credentials.json`)
    }
  } else {
    console.log('\n⚠️  Algunos empleados no fueron configurados')
    console.log('   Revise los errores arriba y ejecute nuevamente')
    
    if (duplicates.length > 0) {
      console.log('\n🔧 SOLUCIÓN PARA DUPLICADOS:')
      console.log('   Configure PINs únicos manualmente para empleados con last5 duplicados')
    }
    
    process.exit(1)
  }
}

// Ejecutar script
main().catch(error => {
  console.error('💥 Error fatal:', error)
  process.exit(1)
})
