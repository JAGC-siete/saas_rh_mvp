import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkGustavoCLI() {
  console.log('🔍 VERIFICANDO GUSTAVO EN EMPLOYEES VIA CLI...\n')
  
  try {
    // 1. Verificar si Gustavo existe en employees
    console.log('1️⃣ Buscando Gustavo en employees...')
    
    const { data: gustavoEmployee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .or(`email.eq.gustavo.gnaz@gmail.com,dni.eq.gustavo.gnaz@gmail.com,name.ilike.%gustavo%`)
      .single()
    
    if (employeeError) {
      console.log('❌ Error buscando Gustavo en employees:', employeeError.message)
    } else {
      console.log('✅ GUSTAVO ENCONTRADO EN EMPLOYEES:')
      console.log(`   - ID: ${gustavoEmployee.id}`)
      console.log(`   - Name: ${gustavoEmployee.name}`)
      console.log(`   - Email: ${gustavoEmployee.email}`)
      console.log(`   - DNI: ${gustavoEmployee.dni}`)
      console.log(`   - Role: ${gustavoEmployee.role}`)
      console.log(`   - Position: ${gustavoEmployee.position}`)
      console.log(`   - Company ID: ${gustavoEmployee.company_id}`)
      console.log(`   - Status: ${gustavoEmployee.status}`)
    }
    
    // 2. Verificar estructura de employees
    console.log('\n2️⃣ Verificando estructura de employees...')
    
    try {
      const { data: structure, error: structureError } = await supabase
        .from('employees')
        .select('*')
        .limit(1)
      
      if (structureError) {
        console.log('❌ Error accediendo a employees:', structureError.message)
      } else {
        console.log('✅ Estructura de employees accesible')
        if (structure && structure.length > 0) {
          const sample = structure[0]
          console.log('   - Columnas disponibles:', Object.keys(sample))
        }
      }
    } catch (e) {
      console.log('❌ Exception accediendo a employees:', e.message)
    }
    
    // 3. Verificar si hay RLS bloqueando
    console.log('\n3️⃣ Verificando acceso con diferentes usuarios...')
    
    // Intentar acceder como service role (debería funcionar)
    try {
      const { data: serviceAccess, error: serviceError } = await supabase
        .from('employees')
        .select('id, name')
        .limit(1)
      
      if (serviceError) {
        console.log('❌ Service role access failed:', serviceError.message)
      } else {
        console.log('✅ Service role access works')
      }
    } catch (e) {
      console.log('❌ Service role access exception:', e.message)
    }
    
    // 4. Verificar si el problema está en la consulta específica
    console.log('\n4️⃣ Probando consulta específica de la API...')
    
    try {
      const { data: specificQuery, error: specificError } = await supabase
        .from('employees')
        .select('name, role, position')
        .eq('dni', 'gustavo.gnaz@gmail.com')
        .single()
      
      if (specificError) {
        console.log('❌ Consulta específica falló:', specificError.message)
        console.log('   - Error code:', specificError.code)
        console.log('   - Error details:', specificError.details)
      } else {
        console.log('✅ Consulta específica funciona')
        console.log('   - Resultado:', specificQuery)
      }
    } catch (e) {
      console.log('❌ Exception en consulta específica:', e.message)
    }
    
    // 5. Estado final
    console.log('\n🎯 DIAGNÓSTICO COMPLETADO')
    if (gustavoEmployee) {
      console.log('✅ Gustavo existe en employees')
      console.log('❌ El problema está en otra parte (RLS, permisos, etc.)')
    } else {
      console.log('❌ Gustavo NO existe en employees')
      console.log('✅ Necesitamos crearlo')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkGustavoCLI()
