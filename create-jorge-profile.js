import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fwyxmovfrzauebiqxchz.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createJorgeProfile() {
  try {
    console.log('🔧 Creando perfil para jorge7gomez@gmail.com...\n')
    
    // Primero obtener el ID del usuario
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Error obteniendo usuarios:', usersError.message)
      return
    }
    
    const jorgeUser = users.users.find(user => user.email === 'jorge7gomez@gmail.com')
    
    if (!jorgeUser) {
      console.error('❌ Usuario jorge7gomez@gmail.com no encontrado')
      return
    }
    
    console.log('✅ Usuario encontrado:', jorgeUser.id)
    
    // Obtener una company_id existente
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id')
      .limit(1)
    
    if (companiesError || !companies.length) {
      console.error('❌ Error obteniendo companies:', companiesError?.message)
      return
    }
    
    const companyId = companies[0].id
    console.log('✅ Company ID encontrado:', companyId)
    
    // Crear el perfil de usuario
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: jorgeUser.id,
        company_id: companyId,
        role: 'company_admin',
        permissions: {
          can_manage_employees: true,
          can_view_payroll: true,
          can_manage_attendance: true,
          can_manage_departments: true,
          can_approve_leave: true
        }
      })
      .select()
    
    if (profileError) {
      console.error('❌ Error creando perfil:', profileError.message)
      return
    }
    
    console.log('✅ Perfil creado exitosamente!')
    console.log('📋 Detalles del perfil:')
    console.log('   👤 ID:', profile[0].id)
    console.log('   🏢 Company ID:', profile[0].company_id)
    console.log('   👔 Rol:', profile[0].role)
    console.log('   🔑 Permisos:', JSON.stringify(profile[0].permissions))
    
    console.log('\n🎯 CREDENCIALES DE PRUEBA:')
    console.log('=========================')
    console.log('📧 Email: jorge7gomez@gmail.com')
    console.log('🔑 Password: jorge123456')
    console.log('✅ Estado: Listo para usar')
    
  } catch (error) {
    console.error('❌ Error general:', error.message)
  }
}

createJorgeProfile() 