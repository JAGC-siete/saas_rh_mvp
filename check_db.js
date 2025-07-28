const { createClient } = require('@supabase/supabase-js')

// Configuración directa (reemplaza con tus valores reales)
const supabaseUrl = 'https://fwyxmovfrzauebiqxchz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjI4MjgzOCwiZXhwIjoyMDUxODU4ODM4fQ.cNsUZ1f_GVPOQDlAVh68WJrnRJH0NsQ1_BeCGGq0H6A'

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabase() {
  console.log('🔍 Conectando a Supabase...')
  console.log('URL:', supabaseUrl)
  
  try {
    // Consultar tablas existentes
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
    
    if (tablesError) {
      console.error('❌ Error consultando tablas:', tablesError)
      return
    }
    
    console.log('\n📋 TABLAS EXISTENTES:')
    console.log('===================')
    if (tables && tables.length > 0) {
      tables.forEach(table => {
        console.log(`- ${table.table_name}`)
      })
    } else {
      console.log('No se encontraron tablas')
    }
    
    // Intentar consultar empleados directamente
    console.log('\n👥 DATOS EN EMPLOYEES:')
    console.log('======================')
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*')
      .limit(5)
    
    if (empError) {
      console.log('❌ Error:', empError.message)
    } else if (employees && employees.length > 0) {
      console.log(`Encontrados ${employees.length} empleados:`)
      employees.forEach(emp => {
        console.log(`- ${emp.name} (DNI: ${emp.dni}) - ${emp.position}`)
      })
    } else {
      console.log('La tabla employees está vacía')
    }
    
    // Consultar companies
    console.log('\n🏢 DATOS EN COMPANIES:')
    console.log('=======================')
    const { data: companies, error: compError } = await supabase
      .from('companies')
      .select('*')
      .limit(5)
    
    if (compError) {
      console.log('❌ Error:', compError.message)
    } else if (companies && companies.length > 0) {
      console.log(`Encontradas ${companies.length} empresas:`)
      companies.forEach(comp => {
        console.log(`- ${comp.name} (${comp.subdomain})`)
      })
    } else {
      console.log('La tabla companies está vacía')
    }
    
    // Consultar attendance_records
    console.log('\n📊 DATOS EN ATTENDANCE_RECORDS:')
    console.log('================================')
    const { data: attendance, error: attError } = await supabase
      .from('attendance_records')
      .select('*')
      .limit(5)
    
    if (attError) {
      console.log('❌ Error:', attError.message)
    } else if (attendance && attendance.length > 0) {
      console.log(`Encontrados ${attendance.length} registros de asistencia:`)
      attendance.forEach(att => {
        console.log(`- ${att.date} - Check-in: ${att.check_in} - Status: ${att.status}`)
      })
    } else {
      console.log('La tabla attendance_records está vacía')
    }
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

checkDatabase()
