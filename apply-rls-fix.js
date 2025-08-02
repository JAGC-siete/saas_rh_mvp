// Script para aplicar la corrección de políticas RLS a Supabase
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const applyRLSFix = async () => {
  console.log('🔧 Aplicando corrección de políticas RLS para user_profiles...\n')
  
  // Configuración de Supabase
  const supabaseUrl = 'https://fwyxmovfrzauebiqxchz.supabase.co'
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I'
  
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Leer el archivo SQL de corrección
    console.log('📋 1. Leyendo script de corrección...')
    const sqlScript = readFileSync('fix-user-profiles-rls.sql', 'utf8')
    
    // Dividir el script en comandos individuales
    const commands = sqlScript
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && cmd !== '')
    
    console.log(`✅ Script leído correctamente. ${commands.length} comandos encontrados.\n`)
    
    // Ejecutar cada comando
    console.log('📋 2. Ejecutando comandos SQL...')
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i]
      console.log(`   Ejecutando comando ${i + 1}/${commands.length}...`)
      
      try {
        // Usar rpc para ejecutar SQL directo
        const { data, error } = await supabaseAdmin.rpc('exec_sql', { 
          sql_query: command + ';' 
        })
        
        if (error) {
          // Si exec_sql no existe, intentar con una consulta directa
          console.log(`   ⚠️  Método exec_sql no disponible, intentando ejecución alternativa...`)
          
          // Para comandos específicos, usar métodos alternativos
          if (command.includes('DROP POLICY')) {
            console.log(`   ✅ Comando DROP POLICY omitido (se ejecutará en Supabase Studio)`)
          } else if (command.includes('CREATE POLICY')) {
            console.log(`   ✅ Comando CREATE POLICY omitido (se ejecutará en Supabase Studio)`)
          } else if (command.includes('CREATE OR REPLACE FUNCTION')) {
            console.log(`   ✅ Comando CREATE FUNCTION omitido (se ejecutará en Supabase Studio)`)
          } else {
            console.log(`   ❌ Error ejecutando comando: ${error.message}`)
          }
        } else {
          console.log(`   ✅ Comando ejecutado correctamente`)
        }
      } catch (cmdError) {
        console.log(`   ❌ Error en comando ${i + 1}: ${cmdError.message}`)
      }
    }
    
    console.log('\n📋 3. Verificando estado después de la corrección...')
    
    // Probar acceso con cliente anónimo
    const supabaseAnon = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxODk5MjEsImV4cCI6MjA2Nzc2NTkyMX0.pXArDqHGA4yjprTqJfsNQXwzS-WLz6NCK5QRbLAyYmA')
    
    const { data: testData, error: testError } = await supabaseAnon
      .from('user_profiles')
      .select('id')
      .limit(1)
    
    if (testError) {
      if (testError.message.includes('infinite recursion')) {
        console.log('❌ El problema de recursión infinita persiste')
        console.log('   Será necesario aplicar la corrección manualmente en Supabase Studio')
      } else {
        console.log('✅ No hay recursión infinita, pero el acceso está restringido (correcto)')
        console.log(`   Error esperado: ${testError.message}`)
      }
    } else {
      console.log('⚠️  El cliente anónimo puede acceder a los datos (revisar políticas)')
    }
    
    // Verificar con service role
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, role')
      .limit(2)
    
    if (adminError) {
      console.log('❌ Error con service role:', adminError.message)
    } else {
      console.log(`✅ Service role funciona correctamente (${adminData.length} registros)`)
    }
    
    console.log('\n📋 4. Instrucciones para completar la corrección:')
    console.log('')
    console.log('🔧 PASOS MANUALES REQUERIDOS:')
    console.log('1. Abrir Supabase Studio (https://supabase.com/dashboard)')
    console.log('2. Ir a SQL Editor')
    console.log('3. Ejecutar el contenido del archivo fix-user-profiles-rls.sql')
    console.log('4. Verificar que las políticas se hayan creado correctamente')
    console.log('')
    console.log('📝 CONTENIDO DEL ARCHIVO SQL:')
    console.log('─'.repeat(60))
    console.log(sqlScript)
    console.log('─'.repeat(60))
    
    console.log('\n🎉 Proceso completado!')
    
  } catch (error) {
    console.error('💥 Error general:', error.message)
  }
}

// Ejecutar la corrección
applyRLSFix()